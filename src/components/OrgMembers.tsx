"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  inviteMember,
  changeRole,
  removeMember,
} from "@/app/(app)/organizations/actions";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import type { OrgMember } from "@/lib/types";

const ROLES: Role[] = ["owner", "agent", "client"];

function InviteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Приглашаем…" : "Пригласить"}
    </button>
  );
}

export default function OrgMembers({
  members,
  currentUserId,
}: {
  members: OrgMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChangeRole(userId: string, role: Role) {
    setError(null);
    startTransition(async () => {
      try {
        await changeRole(userId, role);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  function onRemove(userId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeMember(userId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={async (fd) => {
          setError(null);
          try {
            await inviteMember(fd);
            formRef.current?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Ошибка приглашения");
          }
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[220px] flex-1">
          <label className="label">Email пользователя</label>
          <input
            name="email"
            type="email"
            className="input"
            required
            placeholder="user@company.com"
          />
        </div>
        <div className="w-[150px]">
          <label className="label">Роль</label>
          <select name="role" className="select" defaultValue="client">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <InviteButton />
      </form>

      {error && (
        <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="card divide-y divide-[var(--border)] overflow-hidden">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          return (
            <div
              key={m.user_id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px]">
                  {m.email ?? m.user_id.slice(0, 8)}
                  {isSelf && (
                    <span className="ml-2 text-[12px] text-[var(--muted)]">
                      (вы)
                    </span>
                  )}
                </div>
              </div>
              <select
                className="select w-[140px]"
                value={m.role}
                disabled={pending || isSelf}
                onChange={(e) =>
                  onChangeRole(m.user_id, e.target.value as Role)
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost btn-sm"
                disabled={pending || isSelf}
                onClick={() => onRemove(m.user_id)}
              >
                Удалить
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
