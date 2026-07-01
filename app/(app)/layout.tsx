import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { InstallHint } from "@/components/install-hint";
import { MobileNav } from "@/components/mobile-nav";
import { PageTransition } from "@/components/page-transition";
import { PreviewBanner } from "@/components/preview-banner";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { countInbox } from "@/lib/data/inbox";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient, getSessionUser } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | null = null;
  let inboxCount = 0;

  // In preview-modus (geen Supabase) tonen we de shell zonder auth-check.
  if (supabaseConfigured) {
    const supabase = await createClient();
    // getUser() (gededupt via cache), de MFA-check en de inbox-badge hangen niet
    // van elkaar af → parallel i.p.v. serieel. De AAL-check is faalveilig: een
    // fout blokkeert nooit (geen lockout).
    const [user, aal, inbox] = await Promise.all([
      getSessionUser(),
      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel()
        .then((r) => r.data)
        .catch(() => null),
      countInbox().catch(() => 0),
    ]);
    if (!user) {
      redirect("/login");
    }

    // MFA step-up: met een geverifieerde authenticator moet de sessie naar
    // aal2 vóór de app opengaat. Hier (Server Component) i.p.v. in de proxy,
    // zodat client-navigatie netjes redirect i.p.v. te breken.
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      redirect("/mfa");
    }

    email = user.email ?? null;
    inboxCount = inbox;
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar email={email} inboxCount={inboxCount} />
        <SidebarInset>
          <ServiceWorkerRegister />
          <PullToRefresh />
          <AppTopbar />
          {!supabaseConfigured && <PreviewBanner />}
          <main className="flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
            <div className="mx-auto w-full max-w-3xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </SidebarInset>
        <MobileNav />
        <InstallHint />
      </SidebarProvider>
    </TooltipProvider>
  );
}
