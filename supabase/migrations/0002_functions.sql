-- =============================================================================
-- 0002_functions.sql — Функции и триггеры
-- =============================================================================
-- Ключевая идея: проверки членства/роли вынесены в SECURITY DEFINER функции.
-- Они выполняются от имени владельца (postgres, BYPASSRLS), поэтому обращение
-- к memberships ВНУТРИ них НЕ запускает RLS повторно → нет бесконечной
-- рекурсии политик. Это канонический паттерн мультитенантности в Supabase.
-- =============================================================================

-- --- Проверки членства и роли -------------------------------------------------

-- Является ли текущий пользователь участником организации?
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

-- Является ли сотрудником (owner или agent)?
create or replace function public.is_org_agent(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'agent')
  );
$$;

-- Является ли владельцем организации?
create or replace function public.is_org_owner(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Роль текущего пользователя в организации (или null).
create or replace function public.role_in_org(p_org uuid)
returns text
language sql security definer stable
set search_path = public
as $$
  select m.role from public.memberships m
  where m.org_id = p_org and m.user_id = auth.uid()
  limit 1;
$$;

-- --- Вспомогательные lookups по тикету ---------------------------------------
-- Нужны в политиках для comments/attachments, чтобы получить org/автора тикета,
-- не завися от RLS самой таблицы tickets (тоже SECURITY DEFINER).

create or replace function public.ticket_org(p_ticket uuid)
returns uuid
language sql security definer stable
set search_path = public
as $$ select org_id from public.tickets where id = p_ticket; $$;

create or replace function public.ticket_creator(p_ticket uuid)
returns uuid
language sql security definer stable
set search_path = public
as $$ select created_by from public.tickets where id = p_ticket; $$;

create or replace function public.comment_is_internal(p_comment uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select is_internal from public.ticket_comments where id = p_comment),
    false
  );
$$;

-- --- Триггер: создатель организации становится её владельцем -------------------
-- SECURITY DEFINER, чтобы вставка в memberships прошла в обход INSERT-политики
-- (пользователь ещё не участник, обычная политика бы заблокировала).
create or replace function public.handle_new_organization()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.memberships (org_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict (org_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- --- Триггер: расчёт дедлайна SLA по приоритету -------------------------------
-- urgent → 4ч, high → 8ч, normal → 24ч, low → 72ч (от момента создания).
create or replace function public.compute_sla_due()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sla_due_at := coalesce(new.created_at, now()) +
    case new.priority
      when 'urgent' then interval '4 hours'
      when 'high'   then interval '8 hours'
      when 'normal' then interval '24 hours'
      when 'low'    then interval '72 hours'
      else interval '24 hours'
    end;
  return new;
end;
$$;

drop trigger if exists set_sla_on_insert on public.tickets;
create trigger set_sla_on_insert
  before insert on public.tickets
  for each row execute function public.compute_sla_due();

drop trigger if exists set_sla_on_priority_change on public.tickets;
create trigger set_sla_on_priority_change
  before update of priority on public.tickets
  for each row when (old.priority is distinct from new.priority)
  execute function public.compute_sla_due();

-- --- Триггер: RBAC на уровне строки ------------------------------------------
-- Клиент может править только текст СВОЕГО тикета. Изменение рабочих полей
-- (статус, исполнитель, приоритет, перенос в другую организацию) — только
-- сотрудником. Для клиента такие поля принудительно возвращаются к старым
-- значениям, включая sla_due_at (на случай, если SLA-триггер уже отработал).
create or replace function public.enforce_ticket_update_rules()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.is_org_agent(new.org_id) then
    return new;  -- сотрудник: разрешено всё
  end if;

  -- не-сотрудник (client): запрещаем менять рабочие поля
  new.status      := old.status;
  new.assignee_id := old.assignee_id;
  new.priority    := old.priority;
  new.org_id      := old.org_id;
  new.sla_due_at  := old.sla_due_at;
  return new;
end;
$$;

drop trigger if exists ticket_update_rules on public.tickets;
create trigger ticket_update_rules
  before update on public.tickets
  for each row execute function public.enforce_ticket_update_rules();

-- --- RPC: полнотекстовый поиск с ранжированием -------------------------------
-- SECURITY INVOKER (важно!): функция выполняется от имени вызывающего, поэтому
-- RLS таблицы tickets продолжает действовать — клиент найдёт только свои тикеты,
-- кросс-организационная утечка невозможна. Сортировка по ts_rank (релевантность).
create or replace function public.search_tickets(p_org uuid, p_query text)
returns table (
  id          uuid,
  org_id      uuid,
  subject     text,
  body        text,
  status      text,
  priority    text,
  assignee_id uuid,
  created_by  uuid,
  sla_due_at  timestamptz,
  created_at  timestamptz,
  rank        real
)
language sql stable security invoker
set search_path = public
as $$
  select t.id, t.org_id, t.subject, t.body, t.status, t.priority,
         t.assignee_id, t.created_by, t.sla_due_at, t.created_at,
         ts_rank(t.search_vector, websearch_to_tsquery('russian', p_query)) as rank
  from public.tickets t
  where t.org_id = p_org
    and t.search_vector @@ websearch_to_tsquery('russian', p_query)
  order by rank desc, t.created_at desc;
$$;

-- --- RPC: участники организации с email --------------------------------------
-- SECURITY DEFINER, чтобы прочитать auth.users, но с внутренней проверкой:
-- результат отдаётся только участнику этой организации.
create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, role text, email text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select m.user_id, m.role, u.email, m.created_at
  from public.memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org
    and public.is_org_member(p_org)   -- защита: вызывающий должен быть участником
  order by
    case m.role when 'owner' then 0 when 'agent' then 1 else 2 end,
    m.created_at;
$$;

grant execute on function public.search_tickets(uuid, text) to authenticated;
grant execute on function public.org_members(uuid)          to authenticated;
