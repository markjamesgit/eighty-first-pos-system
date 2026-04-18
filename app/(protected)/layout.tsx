import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/features/auth/auth-guard";
import { ThemeSync } from "@/components/layout/theme-sync";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <ThemeSync />
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
