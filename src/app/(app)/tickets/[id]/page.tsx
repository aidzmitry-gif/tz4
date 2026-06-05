import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/context";
import { StatusBadge, PriorityBadge, SlaBadge } from "@/components/badges";
import TicketWorkflow from "@/components/TicketWorkflow";
import CommentForm from "@/components/CommentForm";
import AttachmentUploader from "@/components/AttachmentUploader";
import { formatDate, shortId } from "@/lib/format";
import { isStaff, type Status, type Priority } from "@/lib/constants";
import type { Ticket, Comment, Attachment, OrgMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: { id: string };
}) {
  const { orgId, role, user } = await getContext();
  const supabase = createClient();
  const staff = isStaff(role);

  // Тикет. Если RLS не отдаёт строку (чужая организация / клиент не автор) —
  // получаем null и показываем 404. Это и есть изоляция на уровне БД.
  const { data: ticketData } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!ticketData) notFound();
  const ticket = ticketData as Ticket;

  // Комментарии. Внутренние (is_internal) клиенту не вернёт RLS —
  // фильтровать в коде не требуется.
  const { data: commentsData } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });
  const comments = (commentsData ?? []) as Comment[];

  // Вложения тикета.
  const { data: attData } = await supabase
    .from("attachments")
    .select("*")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });
  const attachments = (attData ?? []) as Attachment[];

  // Участники организации — для отображения email авторов и списка
  // исполнителей. RPC org_members сам проверяет членство вызывающего.
  let members: OrgMember[] = [];
  if (orgId) {
    const { data: memData } = await supabase.rpc("org_members", {
      p_org: orgId,
    });
    members = (memData ?? []) as OrgMember[];
  }
  const emailById = new Map(members.map((m) => [m.user_id, m.email]));
  const assignees = members
    .filter((m) => m.role === "owner" || m.role === "agent")
    .map((m) => ({ user_id: m.user_id, email: m.email }));

  const who = (id: string | null) =>
    id ? emailById.get(id) ?? shortId(id) : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Левая колонка: тикет + переписка */}
      <div className="space-y-5">
        <div>
          <Link
            href="/tickets"
            className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            ← Ко всем тикетам
          </Link>
          <div className="mt-2 flex items-start gap-3">
            <span className="chip mt-1">#{shortId(ticket.id)}</span>
            <h1
              className="flex-1 text-2xl font-semibold leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {ticket.subject}
            </h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status as Status} />
            <PriorityBadge priority={ticket.priority as Priority} />
            <SlaBadge slaDueAt={ticket.sla_due_at} status={ticket.status as Status} />
            <span className="text-[13px] text-[var(--muted)]">
              · автор {who(ticket.created_by)} · {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>

        {ticket.body && (
          <div className="card whitespace-pre-wrap p-5 text-[15px] leading-relaxed">
            {ticket.body}
          </div>
        )}

        {/* Переписка */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold">
            Комментарии ({comments.length})
          </h2>
          {comments.length === 0 ? (
            <p className="text-[14px] text-[var(--muted)]">
              Пока нет комментариев.
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="card p-4"
                style={
                  c.is_internal
                    ? {
                        background: "var(--warn-bg)",
                        borderColor: "var(--warn)",
                      }
                    : undefined
                }
              >
                <div className="mb-1.5 flex items-center gap-2 text-[13px] text-[var(--muted)]">
                  <span className="font-medium text-[var(--ink-soft)]">
                    {who(c.author_id)}
                  </span>
                  <span>· {formatDate(c.created_at)}</span>
                  {c.is_internal && (
                    <span className="badge badge-warn">внутренняя</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {c.body}
                </div>
              </div>
            ))
          )}
        </div>

        <CommentForm ticketId={ticket.id} canPostInternal={staff} />
      </div>

      {/* Правая колонка: управление + вложения */}
      <aside className="space-y-5">
        {staff && (
          <TicketWorkflow
            ticketId={ticket.id}
            status={ticket.status as Status}
            priority={ticket.priority as Priority}
            assigneeId={ticket.assignee_id}
            assignees={assignees}
          />
        )}

        <div className="card p-4">
          <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Детали
          </h3>
          <dl className="space-y-2 text-[14px]">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">Исполнитель</dt>
              <dd className="text-right">{who(ticket.assignee_id)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">Дедлайн SLA</dt>
              <dd className="text-right">{formatDate(ticket.sla_due_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Вложения ({attachments.length})
            </h3>
          </div>
          {attachments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-[14px] text-[var(--ink)] hover:underline"
                  >
                    <span aria-hidden>📎</span>
                    <span className="truncate">{a.file_name || "файл"}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {orgId && <AttachmentUploader ticketId={ticket.id} orgId={orgId} />}
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            Файлы хранятся в приватном бакете. Доступ — только участникам
            организации по подписанной ссылке.
          </p>
        </div>
      </aside>
    </div>
  );
}
