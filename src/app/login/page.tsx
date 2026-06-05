import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="mb-8 text-center">
        <h1
          className="text-3xl font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Поддержка
        </h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          Мультитенантная система тикетов
        </p>
      </div>
      <AuthForm />
    </main>
  );
}
