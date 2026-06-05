"use client";

import { useFormStatus } from "react-dom";
import { createTicket } from "@/app/(app)/tickets/actions";
import { PRIORITY_LABELS, PRIORITIES } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Создаём…" : "Создать тикет"}
    </button>
  );
}

export default function NewTicketForm() {
  return (
    <form action={createTicket} className="card space-y-4 p-6">
      <div>
        <label className="label">Тема</label>
        <input
          name="subject"
          className="input"
          required
          placeholder="Кратко опишите проблему"
        />
      </div>
      <div>
        <label className="label">Описание</label>
        <textarea
          name="body"
          className="textarea"
          placeholder="Подробности обращения…"
        />
      </div>
      <div className="w-[200px]">
        <label className="label">Приоритет</label>
        <select name="priority" className="select" defaultValue="normal">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        <a href="/tickets" className="btn btn-ghost">
          Отмена
        </a>
      </div>
    </form>
  );
}
