"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { addComment } from "@/app/(app)/tickets/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Отправка…" : "Отправить"}
    </button>
  );
}

export default function CommentForm({
  ticketId,
  canPostInternal,
}: {
  ticketId: string;
  canPostInternal: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await addComment(fd);
        formRef.current?.reset();
      }}
      className="card space-y-3 p-4"
    >
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div>
        <label className="label">Новый комментарий</label>
        <textarea
          name="body"
          className="textarea"
          required
          placeholder="Напишите ответ…"
        />
      </div>
      <div className="flex items-center justify-between">
        {canPostInternal ? (
          <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--ink-soft)]">
            <input
              type="checkbox"
              name="is_internal"
              className="h-4 w-4 accent-[var(--warn)]"
            />
            Внутренняя заметка (не видна клиенту)
          </label>
        ) : (
          <span />
        )}
        <SubmitButton />
      </div>
    </form>
  );
}
