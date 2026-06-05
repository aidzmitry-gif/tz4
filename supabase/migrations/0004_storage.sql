-- =============================================================================
-- 0004_storage.sql — Приватный бакет вложений + Storage-политики
-- =============================================================================
-- Бакет 'attachments' приватный (public = false): публичной ссылки не существует.
-- Доступ к файлу даётся только участникам организации, а файлы клиента —
-- только ему самому. Путь файла: {org_id}/{ticket_id}/{uuid}-{filename}.
-- storage.foldername(name) → массив папок: [1] = org_id, [2] = ticket_id.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Чтение: сотрудник видит все файлы организации; клиент — только файлы
-- тикетов, которые создал сам.
drop policy if exists "att_storage_read" on storage.objects;
create policy "att_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      public.is_org_agent(((storage.foldername(name))[1])::uuid)
      or public.ticket_creator(((storage.foldername(name))[2])::uuid) = auth.uid()
    )
  );

-- Загрузка: сотрудник — в любой тикет организации; клиент — только в свой.
drop policy if exists "att_storage_insert" on storage.objects;
create policy "att_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (
      public.is_org_agent(((storage.foldername(name))[1])::uuid)
      or (
        public.is_org_member(((storage.foldername(name))[1])::uuid)
        and public.ticket_creator(((storage.foldername(name))[2])::uuid) = auth.uid()
      )
    )
  );

-- Удаление: только сотрудники организации.
drop policy if exists "att_storage_delete" on storage.objects;
create policy "att_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_org_agent(((storage.foldername(name))[1])::uuid)
  );
