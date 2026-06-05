import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import CreateOrgForm from "@/components/CreateOrgForm";
import OrgMembers from "@/components/OrgMembers";
import { ROLE_LABELS } from "@/lib/constants";
import type { OrgMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const { memberships, orgId, org, role, user } = await getContext();
  const supabase = createClient();

  let members: OrgMember[] = [];
  if (orgId) {
    const { data } = await supabase.rpc("org_members", { p_org: orgId });
    members = (data ?? []) as OrgMember[];
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Организации
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Ваши организации и роли в них
        </p>
      </div>

      {/* Список членств */}
      <div className="card divide-y divide-[var(--border)] overflow-hidden">
        {memberships.map((m) => (
          <div
            key={m.org_id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <div className="text-[15px] font-medium">
                {m.organizations?.name ?? "Без названия"}
              </div>
              <div className="text-[13px] text-[var(--muted)]">
                тариф: {m.organizations?.plan ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.org_id === orgId && (
                <span className="badge badge-info">текущая</span>
              )}
              <span className="badge badge-muted">{ROLE_LABELS[m.role]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Создание новой организации */}
      <div className="card p-5">
        <h2 className="mb-3 text-[16px] font-semibold">Новая организация</h2>
        <p className="mb-4 text-[14px] text-[var(--muted)]">
          Вы автоматически станете её владельцем.
        </p>
        <CreateOrgForm />
      </div>

      {/* Управление участниками — только для владельца текущей организации */}
      {orgId && role === "owner" && (
        <div className="card p-5">
          <h2 className="mb-1 text-[16px] font-semibold">
            Участники · {org?.name}
          </h2>
          <p className="mb-4 text-[14px] text-[var(--muted)]">
            Приглашайте пользователей по email и назначайте роли. Приглашать
            можно только тех, кто уже зарегистрирован.
          </p>
          <OrgMembers members={members} currentUserId={user!.id} />
        </div>
      )}
    </div>
  );
}
