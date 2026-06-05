import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  type Status,
  type Priority,
} from "@/lib/constants";
import { isOverdue, slaRemaining } from "@/lib/format";

const STATUS_CLASS: Record<Status, string> = {
  open: "badge badge-info",
  pending: "badge badge-warn",
  resolved: "badge badge-ok",
  closed: "badge badge-muted",
};

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "badge badge-muted",
  normal: "badge badge-info",
  high: "badge badge-warn",
  urgent: "badge badge-danger",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={STATUS_CLASS[status]}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={PRIORITY_CLASS[priority]}>{PRIORITY_LABELS[priority]}</span>
  );
}

/** Бейдж SLA: красный, если просрочен; иначе нейтральный с остатком времени. */
export function SlaBadge({
  slaDueAt,
  status,
}: {
  slaDueAt: string | null;
  status: Status;
}) {
  if (!slaDueAt) return <span className="badge badge-muted">без SLA</span>;
  const overdue = isOverdue(slaDueAt, status);
  return (
    <span className={overdue ? "badge badge-danger" : "badge badge-muted"}>
      {slaRemaining(slaDueAt, status)}
    </span>
  );
}
