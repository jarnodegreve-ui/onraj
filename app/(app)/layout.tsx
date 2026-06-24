import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileNav } from "@/components/mobile-nav";
import { QuickAddFab } from "@/components/quick-add";
import { PreviewBanner } from "@/components/preview-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { countInbox } from "@/lib/data/inbox";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    email = user.email ?? null;
    // Badge met aantal nog-te-triëren captures (faalt stil → 0).
    inboxCount = await countInbox().catch(() => 0);
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar email={email} inboxCount={inboxCount} />
        <SidebarInset>
          <AppTopbar />
          {!supabaseConfigured && <PreviewBanner />}
          <main className="flex-1 p-4 pb-24 md:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </SidebarInset>
        <MobileNav />
        {supabaseConfigured && <QuickAddFab />}
      </SidebarProvider>
    </TooltipProvider>
  );
}
