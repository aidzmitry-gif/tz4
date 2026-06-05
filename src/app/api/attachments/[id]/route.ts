import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Скачивание вложения. Защита в два слоя:
 * 1. Строку attachments отдаёт RLS — посторонний (или клиент чужой
 *    организации) получит null → 404. Прямой ссылки на файл он не узнает.
 * 2. Для самого файла создаётся подписанная ссылка на 60 секунд. Постоянной
 *    публичной ссылки не существует — бакет приватный.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();

  const { data: attachment } = await supabase
    .from("attachments")
    .select("file_path")
    .eq("id", params.id)
    .maybeSingle();

  if (!attachment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(attachment.file_path, 60);

  if (error || !signed) {
    return new NextResponse("Unable to sign URL", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
