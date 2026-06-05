import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/constants";

export const CURRENT_ORG_COOKIE = "current_org";

export type OrgRef = { id: string; name: string; plan: string };

export type MembershipRow = {
  org_id: string;
  role: Role;
  organizations: OrgRef | null;
};

export type AppContext = {
  user: { id: string; email: string | null } | null;
  memberships: MembershipRow[];
  orgId: string | null;
  org: OrgRef | null;
  role: Role | null;
};

/**
 * Единая точка получения контекста запроса: пользователь, его организации
 * и «текущая» организация (из cookie, иначе — первая по списку).
 */
export async function getContext(): Promise<AppContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, memberships: [], orgId: null, org: null, role: null };
  }

  const { data } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(id, name, plan)")
    .order("created_at", { ascending: true });

  const memberships = (data ?? []) as unknown as MembershipRow[];
  const cookieOrg = cookies().get(CURRENT_ORG_COOKIE)?.value;
  const current =
    memberships.find((m) => m.org_id === cookieOrg) ?? memberships[0] ?? null;

  return {
    user: { id: user.id, email: user.email ?? null },
    memberships,
    orgId: current?.org_id ?? null,
    org: current?.organizations ?? null,
    role: current?.role ?? null,
  };
}
