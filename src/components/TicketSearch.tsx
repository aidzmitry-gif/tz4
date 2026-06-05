"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUSES,
  PRIORITIES,
} from "@/lib/constants";

export default function TicketSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";

  // Держим инпут в синхроне, если параметры поменялись извне.
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <label className="label">Полнотекстовый поиск</label>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ q });
          }}
          placeholder="Тема или текст обращения…"
        />
      </div>

      <div className="w-[160px]">
        <label className="label">Статус</label>
        <select
          className="select"
          value={status}
          onChange={(e) => apply({ status: e.target.value })}
        >
          <option value="">Все</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[160px]">
        <label className="label">Приоритет</label>
        <select
          className="select"
          value={priority}
          onChange={(e) => apply({ priority: e.target.value })}
        >
          <option value="">Все</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary" onClick={() => apply({ q })}>
        Искать
      </button>
      {(q || status || priority) && (
        <button
          className="btn btn-ghost"
          onClick={() => router.push(pathname)}
        >
          Сбросить
        </button>
      )}
    </div>
  );
}
