"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { createOrg } from "@/app/(app)/organizations/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Создаём…" : "Создать"}
    </button>
  );
}

export default function CreateOrgForm() {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await createOrg(fd);
        ref.current?.reset();
      }}
      className="flex items-end gap-3"
    >
      <div className="flex-1">
        <label className="label">Название организации</label>
        <input
          name="name"
          className="input"
          required
          placeholder="ООО «Ромашка»"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
