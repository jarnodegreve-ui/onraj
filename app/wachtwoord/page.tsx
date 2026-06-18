import { SetPasswordForm } from "@/components/set-password-form";

// Beschermde standalone-pagina (zonder shell). Bereikbaar na een
// wachtwoord-reset-link of om het wachtwoord te wijzigen.
export default function WachtwoordPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
      </div>
      <SetPasswordForm />
    </div>
  );
}
