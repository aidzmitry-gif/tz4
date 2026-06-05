"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import { isStaff, type Priority, type Status } from "@/lib/constants";

/**
 * Создание тикета. org_id берём из текущего контекста, created_by проставит
 * БД (default auth.uid()). sla_due_at рассчитает триггер по приоритету.
 * Вставку всё равно сторожит RLS: org_id обязан быть организацией пользователя.
 */
export async function createTicket(formData: FormData) {
  const { orgId } = await getContext();
  if (!orgId) throw new Error("Нет активной организации");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal") as Priority;

  if (!subject) throw new Error("Тема обязательна");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({ org_id: orgId, subject, body, priority })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/tickets");
  redirect(`/tickets/${data.id}`);
}

/**
 * Изменение статуса / приоритета / исполнителя.
 * Право на это есть только у сотрудников — на стороне приложения это лишь
 * первая проверка; финальное слово за триггером enforce_ticket_update_rules,
 * который откатит запрещённые изменения для роли client.
 */
export async function updateTicket(
  ticketId: string,
  patch: { status?: Status; priority?: Priority; assignee_id?: string | null },
) {
  const { role } = await getContext();
  if (!isStaff(role)) throw new Error("Недостаточно прав");

  const supabase = createClient();
  const { error } = await supabase
    .from("tickets")
    .update(patch)
    .eq("id", ticketId);

  if (error) throw new Error(error.message);
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

/**
 * Добавление комментария. Внутренние заметки (is_internal) может оставлять
 * только сотрудник; для клиента флаг принудительно сбрасывается.
 * Чтение внутренних комментариев клиентом отсекается RLS на уровне select.
 */
export async function addComment(formData: FormData) {
  const { role } = await getContext();

  const ticketId = String(formData.get("ticket_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const isInternal = formData.get("is_internal") === "on" && isStaff(role);

  if (!ticketId) throw new Error("Не указан тикет");
  if (!body) throw new Error("Комментарий пуст");

  const supabase = createClient();
  const { error } = await supabase
    .from("ticket_comments")
    .insert({ ticket_id: ticketId, body, is_internal: isInternal });

  if (error) throw new Error(error.message);
  revalidatePath(`/tickets/${ticketId}`);
}

/**
 * Сохранение метаданных вложения после загрузки файла в Storage.
 * Сам файл уже залит из браузера под сессией пользователя (Storage-RLS).
 * Здесь только пишем строку в таблицу attachments.
 */
export async function recordAttachment(input: {
  ticketId: string;
  filePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("attachments").insert({
    ticket_id: input.ticketId,
    file_path: input.filePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/tickets/${input.ticketId}`);
}
