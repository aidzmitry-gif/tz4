"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrentOrg } from "@/app/(app)/actions";
import { ROLE_LABELS, type Role } from "@/lib/constants";

type Option = { orgId: string; name: string; role: Role };

export default function OrgSwitcher({
  options,
  currentOrgId,
}: {
  options: Option[];
  currentOrgId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (options.length === 0) return null;

  function onChange(orgId: string) {
    startTransition(async () => {
      await setCurrentOrg(orgId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="select max-w-[240px]"
        value={currentOrgId ?? ""}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.orgId} value={o.orgId}>
            {o.name} · {ROLE_LABELS[o.role]}
          </option>
        ))}
      </select>
    </div>
  );
}
