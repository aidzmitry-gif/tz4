"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext, CURRENT_ORG_COOKIE } from "@/lib/context";
import { type Role } from "@/lib/constants";

/**
 * Создание организации. Триггер handle_new_organization автоматически
 * добавит создателя владельцем (owner). Сразу делаем новую организацию текущей.
 */
export async function createOrg(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Название обязательно");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  cookies().set(CURRENT_ORG_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

/**
 * Приглашение участника по email. Чтобы найти user_id по email, нужен доступ
 * к auth.users — он есть только у сервисного клиента (обходит RLS). Сама
 * вставка membership идёт под сессией владельца, поэтому RLS проверит, что
 * приглашающий действительно owner этой организации.
 */
export async function inviteMember(formData: FormData) {
  const { orgId, role } = await getContext();
  if (!orgId) throw new Error("Нет активной организации");
  if (role !== "owner") throw new Error("Приглашать может только владелец");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const memberRole = String(formData.get("role") ?? "client") as Role;
  if (!email) throw new Error("Укажите email");

  // Поиск пользователя по email через сервисный клиент.
  const admin = createAdminClient();
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw new Error(listErr.message);

  const target = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (!target) {
    throw new Error(
      "Пользователь с таким email не найден. Сначала он должен зарегистрироваться.",
    );
  }

  // Вставка под сессией владельца → RLS проверит права.
  const supabase = createClient();
  const { error } = await supabase
    .from("memberships")
    .insert({ org_id: orgId, user_id: target.id, role: memberRole });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Этот пользователь уже состоит в организации");
    }
    throw new Error(error.message);
  }

  revalidatePath("/organizations");
}

export async function changeRole(userId: string, newRole: Role) {
  const { orgId, role } = await getContext();
  if (!orgId) throw new Error("Нет активной организации");
  if (role !== "owner") throw new Error("Менять роли может только владелец");

  const supabase = createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ role: newRole })
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
}

export async function removeMember(userId: string) {
  const { orgId, role, user } = await getContext();
  if (!orgId) throw new Error("Нет активной организации");
  if (role !== "owner") throw new Error("Удалять участников может только владелец");
  if (user?.id === userId) throw new Error("Нельзя удалить самого себя");

  const supabase = createClient();
  const { error } = await supabase
    .from("memberships")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
}
