import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
      </div>
      <LoginForm error={error} />
    </div>
  );
}
