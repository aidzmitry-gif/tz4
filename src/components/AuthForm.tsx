"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/tickets");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Если подтверждение email отключено — сессия уже активна.
        if (data.session) {
          router.push("/tickets");
          router.refresh();
        } else {
          setNotice(
            "Аккаунт создан. Если включено подтверждение email — проверьте почту, иначе просто войдите.",
          );
          setMode("signin");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-sm p-6">
      <div className="mb-5 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="nav-link flex-1 text-center"
          data-active={mode === "signin"}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="nav-link flex-1 text-center"
          data-active={mode === "signup"}
        >
          Регистрация
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Пароль</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-[13px] text-[var(--danger)]">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-[var(--ok-bg)] px-3 py-2 text-[13px] text-[var(--ok)]">
            {notice}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={handleSubmit}
          disabled={loading || !email || !password}
        >
          {loading
            ? "Подождите…"
            : mode === "signin"
              ? "Войти"
              : "Зарегистрироваться"}
        </button>
      </div>
    </div>
  );
}
