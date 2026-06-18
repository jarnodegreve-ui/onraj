# ONRAJ — Persoonlijk portaal

Eén persoonlijk portaal voor **notities**, **financiën**, **agenda** en een
**dashboard**. Gebouwd met Next.js (App Router) + Supabase + Tailwind/shadcn,
gehost op Vercel. Single-user.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Base UI)
- Supabase (Postgres + Auth) via `@supabase/ssr`
- Recharts · date-fns (`nl`) · zod

## Aan de slag

1. `npm install`
2. Maak een Supabase-project, kopieer `.env.example` → `.env.local` en vul in:
   - `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
   - `ALLOWED_EMAIL` — enkel dit adres mag inloggen
3. Draai de migraties in `supabase/migrations/` in volgorde in de Supabase
   SQL-editor: eerst `0001_init.sql`, daarna `0002_extensions.sql`.
4. Supabase → Authentication → URL Configuration: zet de **Site URL** en voeg
   `…/auth/callback` toe aan de redirect-URLs (zowel `http://localhost:3000` als
   je Vercel-domein).
5. Zet **public signups uit** (Authentication → Sign In / Providers).
6. `npm run dev` → http://localhost:3000

> Zonder ingevulde `.env.local` draait ONRAJ in **preview-modus**: de shell is
> zichtbaar, maar login en data zijn uitgeschakeld.

## Scripts

| Script          | Doel                       |
| --------------- | -------------------------- |
| `npm run dev`   | Dev-server (Turbopack)     |
| `npm run build` | Productiebuild             |
| `npm start`     | Productieserver            |
| `npm run lint`  | ESLint                     |

## Structuur

```
app/
  (app)/            beschermde shell: dashboard, taken, notities, financien, agenda
  api/notes/export  ZIP-export van notities als .md (Obsidian)
  (auth)/login      e-mail + wachtwoord login
  auth/callback     wisselt de reset-code in voor een sessie
  wachtwoord        wachtwoord instellen / resetten
components/         app-shell + ui/ (shadcn)
lib/
  supabase/         server-/browser-clients, sessie-proxy, env-detectie
  mappers.ts        snake_case (DB) ↔ camelCase (app)
  types.ts · format.ts · nav.ts
supabase/migrations/  0001 (basis) + 0002 (taken/budgetten/vaste posten) — RLS + triggers
proxy.ts            route-bescherming (Next 16-conventie)
```

## Auth & beveiliging

Single-user via Supabase **e-mail + wachtwoord** (`signInWithPassword`). Je
wachtwoord instellen of resetten gaat via "Wachtwoord vergeten?" → reset-mail →
`app/wachtwoord`. `proxy.ts` beschermt alle routes, ververst de sessie en dwingt
de **`ALLOWED_EMAIL`-allowlist** af. **Row Level Security** in Postgres scope't
elke query op `auth.uid()`, dus je ziet enkel je eigen data.

> Eerste keer inloggen? Je account heeft nog geen wachtwoord — gebruik
> **"Wachtwoord vergeten?"** op de loginpagina om er meteen een in te stellen.

## Deploy (Vercel)

- Koppel deze repo aan een **nieuw** Vercel-project.
- Zet dezelfde env-vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `ALLOWED_EMAIL`).
- Voeg het Vercel-domein toe aan de Supabase Auth redirect-URLs.
