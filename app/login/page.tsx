import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="hidden rounded-3xl bg-stone-950 p-10 text-white lg:block">
          <p className="text-sm uppercase tracking-[0.2em] text-stone-300">Coffee Shop POS</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">
            Fast checkout, live stock tracking, and sales visibility in one admin console.
          </h1>
          <p className="mt-4 max-w-lg text-base text-stone-300">
            Built for Firebase free-tier usage with limited realtime listeners and reusable feature modules.
          </p>
        </section>
        <section className="flex items-center justify-center">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
