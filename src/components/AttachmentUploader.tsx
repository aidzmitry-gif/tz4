"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordAttachment } from "@/app/(app)/tickets/actions";

/** Безопасное имя для ключа в Storage (латиница/цифры/._-). */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return (base || "file") + ext.toLowerCase();
}

export default function AttachmentUploader({
  ticketId,
  orgId,
}: {
  ticketId: string;
  orgId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const path = `${orgId}/${ticketId}/${crypto.randomUUID()}-${safeName(file.name)}`;

      // Загрузка идёт под сессией пользователя → действуют Storage-RLS,
      // которые проверяют членство в организации по первому сегменту пути.
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      await recordAttachment({
        ticketId,
        filePath: path,
        fileName: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
      });

      e.target.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="btn btn-ghost btn-sm cursor-pointer">
        {busy ? "Загрузка…" : "+ Прикрепить файл"}
        <input
          type="file"
          className="hidden"
          disabled={busy}
          onChange={onFile}
        />
      </label>
      {error && (
        <p className="mt-2 text-[13px] text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
