<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ONRAJ — conventies

Persoonlijk portaal (notities, financiën, agenda, dashboard). Single-user.
Next.js 16 App Router + Supabase + Tailwind v4/shadcn (Base UI).

## Belangrijk

- **shadcn = Base UI**, niet Radix. Compositie gebeurt met de **`render`-prop**, niet
  met `asChild`. Bijv. `<SidebarMenuButton render={<Link href="…" />} />`.
- **Route-bescherming staat in `proxy.ts`** (Next 16 hernoemde `middleware.ts`).
- **Database = snake_case, app = camelCase.** Vertaal via `lib/mappers.ts`.
- **RLS staat aan op elke tabel**; elke rij hangt aan `auth.uid()`. Mutaties via
  **Server Actions** (`lib/actions/*`) met **zod**-validatie en Nederlandse
  foutmeldingen.
- **Comments in het Nederlands** voor domeinlogica; code/identifiers in het Engels.
- **Preview-modus**: zonder Supabase-env (`supabaseConfigured === false`) rendert de
  shell zonder auth/data. Houd nieuwe datapagina's hier robuust onder.
- Datums/valuta via `lib/format.ts` (NL-notatie, euro Belgisch, Brusselse tijdzone).

## Verifiëren

`npm run build` (TypeScript) en `npm run lint` moeten schoon zijn. De React 19-regel
`react-hooks/set-state-in-effect` is streng — gebruik `useSyncExternalStore` voor
externe stores i.p.v. `setState` in een effect.
