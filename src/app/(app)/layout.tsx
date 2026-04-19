// Layout del route group (app): tutte le pagine richiedono autenticazione
// e vengono renderizzate dentro l'AppShell con bottom-nav (mobile) /
// sidebar (desktop). Il prefisso "(app)" è solo organizzativo.

import AuthGate from "@/components/auth/AuthGate";
import AppShell from "@/components/layout/AppShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
