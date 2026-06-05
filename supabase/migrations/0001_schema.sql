-- =============================================================================
-- 0001_schema.sql — Базовая схема мультитенантной тикет-системы
-- =============================================================================
-- Таблицы: organizations, memberships, tickets, ticket_comments, attachments.
-- Здесь только структура. Логика доступа (RLS) и функции — в следующих миграциях.
-- =============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- organizations — тенант (организация)
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- memberships — связь пользователь ↔ организация + роль внутри неё
-- Один пользователь может состоять в нескольких организациях с разными ролями.
-- -----------------------------------------------------------------------------
create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'client' check (role in ('owner', 'agent', 'client')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx  on public.memberships(org_id);

-- -----------------------------------------------------------------------------
-- tickets — обращения внутри организации
-- search_vector — генерируемый столбец для полнотекстового поиска (ts_rank).
-- Используется конфигурация 'russian' (стемминг + стоп-слова для кириллицы).
-- subject имеет больший вес ('A'), чем тело ('B').
-- sla_due_at рассчитывается триггером по приоритету (см. 0002).
-- -----------------------------------------------------------------------------
create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  subject       text not null,
  body          text not null default '',
  status        text not null default 'open'   check (status   in ('open', 'pending', 'resolved', 'closed')),
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assignee_id   uuid references auth.users(id) on delete set null,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  sla_due_at    timestamptz,
  created_at    timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('russian', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(body, '')),    'B')
  ) stored
);

create index if not exists tickets_org_idx        on public.tickets(org_id);
create index if not exists tickets_created_by_idx on public.tickets(created_by);
create index if not exists tickets_assignee_idx   on public.tickets(assignee_id);
create index if not exists tickets_status_idx     on public.tickets(org_id, status);
create index if not exists tickets_search_idx      on public.tickets using gin (search_vector);

-- -----------------------------------------------------------------------------
-- ticket_comments — комментарии к тикету
-- is_internal = true → внутренняя заметка, видна только сотрудникам (owner/agent).
-- -----------------------------------------------------------------------------
create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  author_id   uuid default auth.uid() references auth.users(id) on delete set null,
  body        text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists ticket_comments_ticket_idx on public.ticket_comments(ticket_id);

-- -----------------------------------------------------------------------------
-- attachments — метаданные вложений. Сами файлы лежат в приватном
-- Storage-бакете 'attachments' по пути {org_id}/{ticket_id}/{uuid}-{name}.
-- -----------------------------------------------------------------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  comment_id  uuid references public.ticket_comments(id) on delete cascade,
  file_path   text not null,                 -- путь внутри бакета 'attachments'
  file_name   text not null default '',
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists attachments_ticket_idx  on public.attachments(ticket_id);
create index if not exists attachments_comment_idx on public.attachments(comment_id);
