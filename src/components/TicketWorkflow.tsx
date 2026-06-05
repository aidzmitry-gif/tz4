"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTicket } from "@/app/(app)/tickets/actions";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUSES,
  PRIORITIES,
  type Status,
  type Priority,
} from "@/lib/constants";

type Assignee = { user_id: string; email: string | null };

export default function TicketWorkflow({
  ticketId,
  status,
  priority,
  assigneeId,
  assignees,
}: {
  ticketId: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  assignees: Assignee[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function patch(p: {
    status?: Status;
    priority?: Priority;
    assignee_id?: string | null;
  }) {
    startTransition(async () => {
      await updateTicket(ticketId, p);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        Управление (сотрудник)
      </h3>
      <div className="space-y-3">
        <div>
          <label className="label">Статус</label>
          <select
            className="select"
            value={status}
            disabled={pending}
            onChange={(e) => patch({ status: e.target.value as Status })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Приоритет</label>
          <select
            className="select"
            value={priority}
            disabled={pending}
            onChange={(e) => patch({ priority: e.target.value as Priority })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Исполнитель</label>
          <select
            className="select"
            value={assigneeId ?? ""}
            disabled={pending}
            onChange={(e) =>
              patch({ assignee_id: e.target.value || null })
            }
          >
            <option value="">— не назначен —</option>
            {assignees.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.email ?? a.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
