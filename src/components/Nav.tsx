"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import OrgSwitcher from "./OrgSwitcher";
import { signOut } from "@/app/(app)/actions";
import type { Role } from "@/lib/constants";

type OrgOption = { orgId: string; name: string; role: Role };

export default function Nav({
  email,
  orgOptions,
  currentOrgId,
}: {
  email: string | null;
  orgOptions: OrgOption[];
  currentOrgId: string | null;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const isActive = (href: string) =>
    href === "/tickets"
      ? pathname.startsWith("/tickets")
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="container-app flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Link
            href="/tickets"
            className="text-[17px] font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Поддержка
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/tickets"
              className="nav-link"
              data-active={isActive("/tickets")}
            >
              Тикеты
            </Link>
            <Link
              href="/organizations"
              className="nav-link"
              data-active={isActive("/organizations")}
            >
              Организации
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <OrgSwitcher options={orgOptions} currentOrgId={currentOrgId} />
          <span className="hidden text-[13px] text-[var(--muted)] sm:inline">
            {email}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => startTransition(() => void signOut())}
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
