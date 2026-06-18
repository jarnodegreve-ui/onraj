import { TriangleAlert } from "lucide-react";

/**
 * Zichtbaar zolang Supabase nog niet gekoppeld is: de shell rendert dan in
 * preview-modus zonder login of data.
 */
export function PreviewBanner() {
  return (
    <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Preview-modus.</strong> Supabase is nog niet gekoppeld — login en
        data zijn uitgeschakeld. Vul{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/40">
          .env.local
        </code>{" "}
        in en herstart de dev-server.
      </p>
    </div>
  );
}
