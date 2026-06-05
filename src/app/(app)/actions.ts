"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_ORG_COOKIE } from "@/lib/context";

/**
 * Переключение текущей организации. Сама принадлежность проверяется RLS:
 * даже если подменить cookie на чужой org_id, запросы вернут пустоту,
 * потому что в memberships у пользователя нет такой строки.
 */
export async function setCurrentOrg(orgId: string) {
  cookies().set(CURRENT_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
