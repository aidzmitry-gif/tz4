export type Role = "owner" | "agent" | "client";
export type Status = "open" | "pending" | "resolved" | "closed";
export type Priority = "low" | "normal" | "high" | "urgent";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Владелец",
  agent: "Агент",
  client: "Клиент",
};

export const STATUS_LABELS: Record<Status, string> = {
  open: "Открыт",
  pending: "В работе",
  resolved: "Решён",
  closed: "Закрыт",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

/** Часы до дедлайна SLA по приоритету (дублирует логику триггера в БД). */
export const SLA_HOURS: Record<Priority, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 72,
};

export const STATUSES: Status[] = ["open", "pending", "resolved", "closed"];
export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];

/** Статусы, при которых тикет считается завершённым (SLA больше не «горит»). */
export const CLOSED_STATUSES: Status[] = ["resolved", "closed"];

export function isStaff(role: Role | null | undefined): boolean {
  return role === "owner" || role === "agent";
}
