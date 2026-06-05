import { CLOSED_STATUSES, type Status } from "./constants";

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

/** Тикет просрочен по SLA, если дедлайн в прошлом и тикет не завершён. */
export function isOverdue(
  slaDueAt: string | null | undefined,
  status: Status,
): boolean {
  if (!slaDueAt || CLOSED_STATUSES.includes(status)) return false;
  return new Date(slaDueAt).getTime() < Date.now();
}

/** Человекочитаемый остаток/просрочка времени до дедлайна. */
export function slaRemaining(
  slaDueAt: string | null | undefined,
  status: Status,
): string {
  if (!slaDueAt) return "—";
  if (CLOSED_STATUSES.includes(status)) return "завершён";

  const diffMs = new Date(slaDueAt).getTime() - Date.now();
  const overdue = diffMs < 0;
  const totalMin = Math.floor(Math.abs(diffMs) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const human = h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
  return overdue ? `просрочен на ${human}` : `осталось ${human}`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
