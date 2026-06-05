-- =============================================================================
-- 0003_rls.sql — Row Level Security: изоляция тенантов и RBAC на уровне БД
-- =============================================================================
-- Изоляция работает в Postgres, а не в коде приложения. Даже прямой запрос
-- к API/БД от имени пользователя организации A не вернёт данные организации B.
-- =============================================================================

alter table public.organizations  enable row level security;
alter table public.memberships    enable row level security;
alter table public.tickets        enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.attachments    enable row level security;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
drop policy if exists "org_select_members"   on public.organizations;
drop policy if exists "org_insert_any_auth"  on public.organizations;
drop policy if exists "org_update_owner"     on public.organizations;
drop policy if exists "org_delete_owner"     on public.organizations;

create policy "org_select_members" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

-- Любой авторизованный может создать организацию; триггер сделает его owner.
create policy "org_insert_any_auth" on public.organizations
  for insert to authenticated
  with check (true);

create policy "org_update_owner" on public.organizations
  for update to authenticated
  using (public.is_org_owner(id))
  with check (public.is_org_owner(id));

create policy "org_delete_owner" on public.organizations
  for delete to authenticated
  using (public.is_org_owner(id));

-- -----------------------------------------------------------------------------
-- memberships  (первая запись owner создаётся триггером в обход политик)
-- -----------------------------------------------------------------------------
drop policy if exists "mem_select_in_org" on public.memberships;
drop policy if exists "mem_insert_owner"  on public.memberships;
drop policy if exists "mem_update_owner"  on public.memberships;
drop policy if exists "mem_delete_owner"  on public.memberships;

create policy "mem_select_in_org" on public.memberships
  for select to authenticated
  using (public.is_org_member(org_id));

create policy "mem_insert_owner" on public.memberships
  for insert to authenticated
  with check (public.is_org_owner(org_id));

create policy "mem_update_owner" on public.memberships
  for update to authenticated
  using (public.is_org_owner(org_id))
  with check (public.is_org_owner(org_id));

create policy "mem_delete_owner" on public.memberships
  for delete to authenticated
  using (public.is_org_owner(org_id));

-- -----------------------------------------------------------------------------
-- tickets
--   • сотрудник (owner/agent) видит ВСЕ тикеты организации;
--   • клиент видит ТОЛЬКО свои тикеты (created_by = он сам).
-- -----------------------------------------------------------------------------
drop policy if exists "ticket_select" on public.tickets;
drop policy if exists "ticket_insert" on public.tickets;
drop policy if exists "ticket_update" on public.tickets;
drop policy if exists "ticket_delete" on public.tickets;

create policy "ticket_select" on public.tickets
  for select to authenticated
  using (
    public.is_org_agent(org_id)
    or (public.is_org_member(org_id) and created_by = auth.uid())
  );

create policy "ticket_insert" on public.tickets
  for insert to authenticated
  with check (
    public.is_org_member(org_id)
    and created_by = auth.uid()
  );

-- Клиент может обновлять свой тикет (текст), но рабочие поля ему вернёт
-- триггер enforce_ticket_update_rules (см. 0002).
create policy "ticket_update" on public.tickets
  for update to authenticated
  using (
    public.is_org_agent(org_id)
    or (public.is_org_member(org_id) and created_by = auth.uid())
  )
  with check (
    public.is_org_agent(org_id)
    or (public.is_org_member(org_id) and created_by = auth.uid())
  );

create policy "ticket_delete" on public.tickets
  for delete to authenticated
  using (public.is_org_agent(org_id));

-- -----------------------------------------------------------------------------
-- ticket_comments
--   • виден, если виден родительский тикет;
--   • внутренний комментарий (is_internal) — только сотрудникам.
-- -----------------------------------------------------------------------------
drop policy if exists "comment_select" on public.ticket_comments;
drop policy if exists "comment_insert" on public.ticket_comments;
drop policy if exists "comment_update" on public.ticket_comments;
drop policy if exists "comment_delete" on public.ticket_comments;

create policy "comment_select" on public.ticket_comments
  for select to authenticated
  using (
    (
      public.is_org_agent(public.ticket_org(ticket_id))
      or (
        public.is_org_member(public.ticket_org(ticket_id))
        and public.ticket_creator(ticket_id) = auth.uid()
      )
    )
    and (
      is_internal = false
      or public.is_org_agent(public.ticket_org(ticket_id))
    )
  );

create policy "comment_insert" on public.ticket_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_org_agent(public.ticket_org(ticket_id))
      or (
        public.is_org_member(public.ticket_org(ticket_id))
        and public.ticket_creator(ticket_id) = auth.uid()
      )
    )
    -- внутренний комментарий может создать только сотрудник
    and (
      is_internal = false
      or public.is_org_agent(public.ticket_org(ticket_id))
    )
  );

create policy "comment_update" on public.ticket_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "comment_delete" on public.ticket_comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or public.is_org_agent(public.ticket_org(ticket_id))
  );

-- -----------------------------------------------------------------------------
-- attachments
--   • видно, если виден тикет; если вложение прикреплено к внутреннему
--     комментарию — только сотрудникам.
-- -----------------------------------------------------------------------------
drop policy if exists "att_select" on public.attachments;
drop policy if exists "att_insert" on public.attachments;
drop policy if exists "att_delete" on public.attachments;

create policy "att_select" on public.attachments
  for select to authenticated
  using (
    (
      public.is_org_agent(public.ticket_org(ticket_id))
      or (
        public.is_org_member(public.ticket_org(ticket_id))
        and public.ticket_creator(ticket_id) = auth.uid()
      )
    )
    and (
      comment_id is null
      or public.comment_is_internal(comment_id) = false
      or public.is_org_agent(public.ticket_org(ticket_id))
    )
  );

create policy "att_insert" on public.attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_org_agent(public.ticket_org(ticket_id))
      or (
        public.is_org_member(public.ticket_org(ticket_id))
        and public.ticket_creator(ticket_id) = auth.uid()
      )
    )
  );

create policy "att_delete" on public.attachments
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.is_org_agent(public.ticket_org(ticket_id))
  );
