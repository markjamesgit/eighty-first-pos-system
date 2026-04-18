import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 px-4 py-10 selection:bg-stone-900 selection:text-white">
      {/* Minimalist Abstract Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-200/50 via-stone-50/20 to-transparent" />
        <div className="absolute h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="hidden flex-col justify-center rounded-[2.5rem] bg-stone-900 p-12 text-white shadow-2xl lg:flex">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-400">Coffee POS Engine</p>
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-stone-50">
            Fast checkout, live stock tracking, and sales visibility in one admin console.
          </h1>
          <div className="mt-8 h-px w-16 bg-stone-700" />
          <p className="mt-8 max-w-lg text-sm text-stone-400 font-medium leading-relaxed">
            Built for seamless Firebase scale with optimized database listeners, advanced stock control, and beautiful feature modules.
          </p>
        </section>
        <section className="flex items-center justify-center">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
