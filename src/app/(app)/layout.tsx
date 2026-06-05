import { redirect } from "next/navigation";
import Link from "next/link";
import { getContext } from "@/lib/context";
import Nav from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getContext();
  if (!ctx.user) redirect("/login");

  const orgOptions = ctx.memberships.map((m) => ({
    orgId: m.org_id,
    name: m.organizations?.name ?? "Без названия",
    role: m.role,
  }));

  return (
    <div className="min-h-screen">
      <Nav
        email={ctx.user.email}
        orgOptions={orgOptions}
        currentOrgId={ctx.orgId}
      />
      <main className="container-app py-7">
        {ctx.memberships.length === 0 ? (
          <div className="card mx-auto max-w-lg p-8 text-center">
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Добро пожаловать!
            </h2>
            <p className="mt-2 text-[15px] text-[var(--muted)]">
              Вы пока не состоите ни в одной организации. Создайте свою — и вы
              станете её владельцем.
            </p>
            <Link href="/organizations" className="btn btn-primary mt-5">
              Создать организацию
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
