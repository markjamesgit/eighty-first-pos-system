import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-50 px-4 py-10 selection:bg-stone-900 selection:text-white">
      {/* Clean Aesthetic Minimal Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#fafaf9] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-stone-200/40 via-stone-100/10 to-transparent" />
        
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-stone-300/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[45%] h-[50%] bg-amber-100/20 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] bg-orange-50/30 rounded-full blur-[120px]" />
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
