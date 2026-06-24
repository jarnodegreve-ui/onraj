import { MfaChallenge } from "@/components/mfa-challenge";

export const metadata = { title: "Verificatie · ONRAJ" };

// Alleen interne paden als redirect-doel toelaten (geen open redirect).
function safeNext(value: string | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return "/dashboard";
  }
  return value;
}

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
      </div>
      <MfaChallenge next={safeNext(next)} />
    </div>
  );
}
