import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import { StatusBadge, PriorityBadge, SlaBadge } from "@/components/badges";
import TicketSearch from "@/components/TicketSearch";
import { formatDate, isOverdue, shortId } from "@/lib/format";
import type { Ticket } from "@/lib/types";
import type { Status, Priority } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; priority?: string };
}) {
  const { orgId } = await getContext();
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim();
  const statusFilter = searchParams.status ?? "";
  const priorityFilter = searchParams.priority ?? "";

  let tickets: Ticket[] = [];

  if (q && orgId) {
    // Полнотекстовый поиск через RPC. Функция SECURITY INVOKER → RLS в силе,
    // поэтому чужие организации в выдачу не попадут даже теоретически.
    const { data } = await supabase.rpc("search_tickets", {
      p_org: orgId,
      p_query: q,
    });
    tickets = (data ?? []) as Ticket[];
    // Фильтры применяем поверх результатов поиска.
    if (statusFilter)
      tickets = tickets.filter((t) => t.status === statusFilter);
    if (priorityFilter)
      tickets = tickets.filter((t) => t.priority === priorityFilter);
  } else {
    // Обычная выборка. org_id фильтр дублирует RLS (ускоряет план запроса).
    let query = supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (orgId) query = query.eq("org_id", orgId);
    if (statusFilter) query = query.eq("status", statusFilter);
    if (priorityFilter) query = query.eq("priority", priorityFilter);
    const { data } = await query;
    tickets = (data ?? []) as Ticket[];
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Тикеты
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">
            {tickets.length}{" "}
            {q ? "найдено по запросу" : "в текущей организации"}
          </p>
        </div>
        <Link href="/tickets/new" className="btn btn-primary">
          + Новый тикет
        </Link>
      </div>

      <TicketSearch />

      {tickets.length === 0 ? (
        <div className="card p-10 text-center text-[var(--muted)]">
          {q
            ? "Ничего не найдено. Попробуйте изменить запрос."
            : "Пока нет тикетов. Создайте первый."}
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          {tickets.map((t) => {
            const overdue = isOverdue(t.sla_due_at, t.status as Status);
            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-[var(--surface-2)]"
                style={
                  overdue
                    ? { boxShadow: "inset 3px 0 0 var(--danger)" }
                    : undefined
                }
              >
                <span className="chip shrink-0">#{shortId(t.id)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">
                    {t.subject}
                  </div>
                  <div className="mt-0.5 text-[13px] text-[var(--muted)]">
                    создан {formatDate(t.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={t.priority as Priority} />
                  <StatusBadge status={t.status as Status} />
                  <span className="hidden md:inline">
                    <SlaBadge
                      slaDueAt={t.sla_due_at}
                      status={t.status as Status}
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
