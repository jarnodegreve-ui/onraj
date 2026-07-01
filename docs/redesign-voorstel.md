# ONRAJ Redesign — "De Editie"

*Voorstel, juli 2026. Puur presentatie: geen wijzigingen aan data, actions of routes.*

---

## 1. Designvisie

ONRAJ wordt **De Editie**: elke dag opent het portaal als de dagkrant van één man — een masthead met editienummer, een groet in serif, cijfers in mono, secties gescheiden door hairlines in plaats van een zee van kaarten. De warm-editorial identiteit die nu alleen in een CSS-comment leeft, wordt het systeem zelf: Instrument Serif als redactionele stem, JetBrains Mono als datalaag, denim als enige interactiekleur — gedoseerd als de punt achter ONRAJ●, niet als verf. Het resultaat is slanker dan shadcn ooit uit de doos komt: minder dozen, meer typografie, elke pixel verdient zijn plek.

---

## 2. Wat er vandaag wringt

Concrete observaties uit de code:

1. **Instrument Serif bestaat niet.** Hij staat in de huisstijl-comment (`globals.css` r52–56) maar wordt in `app/layout.tsx` nooit geladen en nergens gebruikt. Het "editorial" in warm-editorial ontbreekt letterlijk — de app is nu een nette grotesk-app zoals duizend andere.
2. **Twee kaartrecepten naast elkaar.** `ui/card.tsx` gebruikt `ring-1 ring-foreground/10` + box-shadow via `[data-slot=card]`; de dashboard-tegels (`SaldoCard`, `StatTile` in `dashboard/page.tsx`) gebruiken `border bg-card` met eigen hover. Zelfde app, twee lichamen.
3. **Geldkleuren zijn 13× hardcoded** `emerald-600/dark:emerald-400` en `rose-*` (transaction-list, investments-card, budgets-card, cashflow-outlook, task-item, …). Koele shadcn-defaults die vloeken met crème/denim, en onvindbaar bij een restyle.
4. **Halfslachtige modulekleuren.** `lib/nav.ts` heeft een `accent`-veld per module — allemaal `#3d68be`. Het dashboard hardcodet er dan weer `#c98a3d` doorheen. Kiezen of delen.
5. **Dubbele titels + loze zinnen.** De topbar toont de moduletitel, `PageHeader` herhaalt hem groter mét een beschrijving ("Inkomsten, uitgaven en je maandoverzicht.") die de enige gebruiker al drie jaar weet. Twee regels verspild per scherm — precies wat "slanker" niet is.
6. **De klok is geen hero.** `text-2xl` mono, en ernaast staat… een `PushToggle`. Een instellingen-control op de duurste plek van de app.
7. **Ad-hoc radii.** `--radius: 1rem` met zeven afgeleiden, maar in de praktijk: kaarten `rounded-2xl`, dock `rounded-[26px]`, checkbox `rounded-[7px]`. Geen systeem.
8. **Denim faalt in dark.** `#3d68be` op `#141416` haalt ~3,4:1 — actieve nav-labels en links zijn te donker. De charts kregen wél een lichte variant (`#5b82d4`), tekst niet.

---

## 3. Het nieuwe systeem

### 3.1 Kleur

Principe: **crème is de inkt, denim is de punt.** Denim verschijnt alleen op interactie (knoppen, actieve staat, de brand-dot, selectie). Alles wat data is, is mono + crème/slate. Geld krijgt eigen semantische tokens in warme tinten (flesgroen/terracotta i.p.v. emerald/rose). Modules krijgen géén regenboog — hun identiteit komt van editorial kickers (zie typografie), niet van kleur.

**Dark — "Zwart" (default):**

| Token | Waarde | Gebruik |
|---|---|---|
| `--background` | `#141416` | behouden — warm near-black |
| `--card` | `#1C1C1F` | één vlakniveau (was `#1e1e22`, iets vlakker) |
| `--surface-2` | `#232327` | inzetten: card-footers, code, input-bg |
| `--foreground` | `#ECE7DF` | crème-inkt, behouden |
| `--muted-foreground` | `#9A948B` | warmer én lichter dan huidige `#8c8884` (contrast) |
| `--border` | `rgb(236 231 223 / 0.08)` | hairline; hover-ring `/0.16` |
| `--primary` | `#3D68BE` | knoppen, vlakken (wit erop) |
| `--primary-soft` | `#6D90D8` | **nieuw** — links/actieve labels/iconen op donker (≈5,8:1) |
| `--pos` | `#5FAE8C` | geld +, flesgroen |
| `--neg` | `#E08573` | geld −, terracotta (vervangt ook `--destructive`) |
| `--warm` | `#D6A05A` | secundair accent: deadlines-vandaag, budget-bijna-op |
| `--accent` | `rgb(236 231 223 / 0.05)` | crème-waas voor hover/actieve rijen |
| charts | `#5B82D4 / #D6A05A / #5FAE8C / #E08573 / #9B8CC9` | pos/neg-consistent |

**Light — "Blauw":**

| Token | Waarde |
|---|---|
| `--background` | `#F0E4D6` · `--card #FBF7F0` · `--surface-2 #F4EDE2` |
| `--foreground` | `#2C3346` · `--muted-foreground #6E6A75` (donkerder dan nu) |
| `--border` | `rgb(44 51 70 / 0.12)` |
| `--primary` | `#3D68BE` · `--primary-soft #34599F` (op licht: dónkerder, niet lichter) |
| `--pos` | `#2E7D5B` · `--neg #B4543E` · `--warm #A6712C` |

Dosering: denim mag per scherm op **maximaal drie plekken** branden (primaire knop, actieve navstaat, brand-dot). De crème doet de warmte, hairlines doen de structuur.

### 3.2 Typografie

Vier stemmen, elk met één taak:

| Rol | Font | Spec | Waar |
|---|---|---|---|
| **Kicker** | JetBrains Mono | 11px / 500 / uppercase / tracking `+0.08em` / muted | sectielabels, kaarttitels, masthead ("VERMOGEN", "EDITIE Nº 182") |
| **Editorial** | Instrument Serif | 400 (+ italic), 34–44px / 1.05 | dagelijkse groet, vermogen-hero, lege staten, notitietitels in de index |
| **Kop** | Schibsted Grotesk | h1 20px/600/−0.02em · h2 16px/600 | paginatitels, dialogtitels, wordmark (800) |
| **Body** | Hanken Grotesk | 15px/400/1.5 · secundair 13px | lopende tekst, taken, formulieren |
| **Data** | JetBrains Mono | 13–14px / 500 / tabular-nums | álle bedragen in lijsten, datums, tellers, de klok (40px/500) |

De radicaalste zet: **kaarttitels worden kickers.** "Beleggingen" wordt `BELEGGINGEN` in 11px mono — dat ene detail haalt het shadcn-gevoel er in één keer af en maakt elke sectie 8px lager. Instrument Serif verschijnt spaarzaam maar op de momenten die tellen: de groet, het vermogen, en overal waar de app "praat" (lege staten: *"Niets te triëren. Mooi zo."*).

Instrument Serif wordt geladen als `--font-serif` in `app/layout.tsx` (weights 400 + italic, `display: swap`).

### 3.3 Vorm & diepte

- **Radius-schaal, vast:** controls `8px` · kaarten/velden `14px` · sheets/dialogen `20px` · dock/pills `full`. `--radius: 0.875rem`, afgeleiden herzien, ad-hoc waarden (`26px`, `7px`) eruit.
- **Eén kaartrecept:** `bg-card ring-1 ring-foreground/8 rounded-[14px]`. Geen border+ring-mix meer, geen box-shadow op kaarten in dark (vlak = premium op near-black); light houdt `0 1px 2px rgb(44 51 70 / 0.06)`. Hover: `ring-foreground/16`, nooit een schaduw-sprong. Schaduwen zijn exclusief voor zwevende lagen: dock, popovers, dialogen.
- **Twee containmentniveaus:** het **vel** (hairline-secties direct op de achtergrond — dashboard, lijsten) en de **kaart** (alleen waar interactie omkadering vraagt: charts, editors, dock). Minder dozen = slanker.

### 3.4 Dichtheid — "slank" als regel, niet als wens

- Kaartpadding `--card-spacing: 14px` (was 16), `sm`-variant 12px.
- Verticale ritmiek alleen uit {4, 8, 12, 16, 24}; paginasecties `space-y-5`.
- Lijstregels 44px hoog (`py-2.5`), meta op dezelfde regel rechts (mono) i.p.v. eronder waar het kan.
- **Eén titel per scherm:** de topbar-titel vervalt op pagina's met een masthead; `PageHeader` verliest zijn `description` en wordt `mb-4`.
- Content blijft `max-w-3xl`; charts max 160px hoog; sparklines 32px.

### 3.5 Beweging — signature micro-interacties

1. **De seconde-punt.** De klok toont `14:32●` — de denim brand-dot pulseert elke seconde (scale 1→0.6→1, 200ms ease-out) i.p.v. tikkende secondecijfers. Het merk is letterlijk de hartslag van de app.
2. **Inktpunt-check.** Taak afvinken: de checkbox vult niet, er springt een denim dot in (spring, scale 0.4→1), dan pas de streep door de titel (120ms delay). Zelfde dot als de wordmark.
3. **Cijferrol.** `CountUp` wordt een odometer: cijfers rollen verticaal per digit (alleen op hero-bedragen; lijsten blijven statisch).
4. **Dock-plus.** De centrale + roteert 45° naar × wanneer quick-add opent; de dock-labels dimmen naar 40%.

---

## 4. Per scherm

### 4.1 Dashboard — "de voorpagina"

Geen kaartenraster meer maar **één vel**: masthead, groet, klok, vandaag-strip en secties met hairlines. De PushToggle verhuist naar Instellingen. Hero = de klok + de serif-groet; het vermogen krijgt het tweede hero-moment in serif-cijfers. Editienummer = dagnummer van het jaar.

```
┌──────────────────────────────────────┐
│ EDITIE Nº 182 · DI 1 JULI      ⌘  ☰ │  masthead: mono-kicker
│                                      │
│ Goeiemiddag, Jarno.                  │  Instrument Serif italic 34px
│ 14:32●                               │  mono 40px · dot = seconde-tik
├──────────────────────────────────────┤
│ VANDAAG   3 taken · 2 inbox · +€ 412 │  vandaag-strip: 1 regel mono
├──────────────────────────────────────┤
│ VANDAAG & TE LAAT                    │  kicker (te laat in terracotta)
│ ◻ Offerte Zenobe nakijken      2 jul │
│ ◻ BTW-aangifte              ⚑ 28 jun │
│ alle taken →                         │
├──────────────────────────────────────┤
│ VERMOGEN                             │
│ € 184.502                            │  Instrument Serif 40px
│ ▁▂▃▅▆▇▇   +2,1% deze maand           │  sparkline 32px · --pos
├──────────────────────────────────────┤
│ SALDO JULI        IN         UIT     │
│ +€ 412         € 5.214    € 4.802    │  mono · pos/neg-tokens
├──────────────────────────────────────┤
│ LAATSTE NOTITIES                     │
│ Meeting De Lijn               29 jun │
│ Idee: tachograaf-suite        27 jun │
└──────────────────────────────────────┘
```

### 4.2 Taken

Lijst als vel, categorieën als kickers (vervangt badge-herhaling per rij), "TE LAAT" als apart blok bovenaan in terracotta. Prioriteit blijft de dot; deadline rechts in mono. Swipe-gedrag ongemoeid.

```
┌──────────────────────────────────────┐
│ Taken             [Vandaag·Week·Alles]│
├──────────────────────────────────────┤
│ TE LAAT (2)                          │  kicker in --neg
│ ◻ BTW-aangifte                28 jun │
│ ◻ Verzekering bus 12          30 jun │
│                                      │
│ WERK (5)                             │
│ ◻ Offerte Zenobe        ●      2 jul │
│ ◻ Roosters Q3           ●      4 jul │
│                                      │
│ PRIVÉ (3)                            │
│ ◻ Tandarts bellen                 —  │
└──────────────────────────────────────┘
```

### 4.3 Financiën

Hiërarchie omgegooid: **vermogen bovenaan als serif-hero** (nu verstopt in een dashboard-chartje), dan de maandstrip, dan pas de segmenten. Alle bedragen mono; +/− via `--pos`/`--neg`. Het slot (🔒) blijft; vergrendeld toont de hero `€ •••` in serif — ook mooi.

```
┌──────────────────────────────────────┐
│ Financiën           ‹ juli 2026 ›  🔒│
│                                      │
│ VERMOGEN                             │
│ € 184.502                 +2,1% ▲    │  serif 40px · pos-badge
│ ─────────── 12m-lijn ───────────     │
├──────────────────────────────────────┤
│ IN € 5.214  ·  UIT € 4.802  ·  +€412 │  maandstrip mono
├──────────────────────────────────────┤
│ [Transacties·Budget·Sparen·Beleggen] │
│ 30/6  Colruyt        Boodsch. −87,40 │
│ 29/6  Loon           Inkomen +3.950  │
│ 28/6  Telenet        Vast     −64,00 │
└──────────────────────────────────────┘
```

### 4.4 Notities — "de inhoudsopgave"

Geen grid van kaarten maar een tijdschrift-index: serif-titels, mono-dag, maand-kickers, hairlines. Tags klein achter de titel.

```
┌──────────────────────────────────────┐
│ Notities                      🔎   + │
├──────────────────────────────────────┤
│ JUNI                                 │
│ Meeting De Lijn                   29 │  Instrument Serif 18px
│   #werk #delijn                      │
│ Idee: tachograaf-suite            27 │
│                                      │
│ MEI                                  │
│ Zomerplanning bussen              31 │
└──────────────────────────────────────┘
```

### 4.5 Inbox — "de postkamer"

Triëren is hier de enige taak, dus de acties staan ín de rij (geen menu-omweg). Capture-tekst in serif italic — het zijn citaten uit je eigen hoofd. Teller in de masthead.

```
┌──────────────────────────────────────┐
│ Inbox · 4              alles archief │
├──────────────────────────────────────┤
│ "Bel Van Hool i.v.m. levering"       │  serif italic
│ TG · 09:12    [→ Taak] [→ Notitie] ✕ │  mono meta + acties
├──────────────────────────────────────┤
│ "Idee: laadplan koppelen aan OCPI"   │
│ TG · gisteren [→ Taak] [→ Notitie] ✕ │
└──────────────────────────────────────┘
```

### 4.6 Mobiele shell & dock

Topbar verdwijnt op mobiel (masthead per pagina neemt het over → één statuslaag minder). Dock nog slanker: 56px i.p.v. 64px, hairline-ring i.p.v. border+shadow-xl, tekst-labels blijven (bewuste keuze van de eigenaar), + blijft centraal maar zakt ín het dock (geen `-mt-1`-uitsteeksel).

```
┌──────────────────────────────────────┐
│  (content — masthead bovenaan,       │
│   geen aparte topbar)                │
│                                      │
│   ╭────────────────────────────╮     │
│   │ Dash  Taken (＋) Inbox Fin │     │  56px · blur · hairline
│   ╰────────────────────────────╯     │
└──────────────────────────────────────┘
```

### 4.7 Login

De eerste indruk van het merk: wordmark groot, de dagregel in serif eronder, formulier als vel zonder kaart-om-kaart. Aanmeldknop is de enige denim op het scherm.

```
┌──────────────────────────────────────┐
│                                      │
│              ONRAJ●                  │  Schibsted 800, 40px
│      dinsdag 1 juli — editie 182     │  serif italic, muted
│                                      │
│   e-mail        [________________]   │
│   wachtwoord    [________________]   │
│              [ Aanmelden ]           │
│                                      │
│          wachtwoord vergeten?        │
└──────────────────────────────────────┘
```

---

## 5. Signature-momenten

1. **De seconde-punt.** `14:32●` — de denim dot uit de wordmark pulseert als secondewijzer. Niemand heeft een klok waarvan het merk de hartslag is; het maakt de klok het typografische statement dat hij verdient.
2. **Het editie-masthead.** Elke dag `EDITIE Nº 182 · DI 1 JULI` boven een groet in Instrument Serif italic ("Goeiemorgen, Jarno."). De app voelt elke ochtend als een vers gedrukte krant van je eigen leven — en het kost welgeteld twee regels.
3. **Serif-vermogen.** Hero-bedragen (vermogen, portefeuille-totaal) in Instrument Serif 40px — editorial cijfers die geen enkele finance-app aandurft. Lijstbedragen blijven strak mono; het contrast tussen die twee ís de identiteit.

---

## 6. Implementatieplan

Alle fases zijn puur presentatie (className/markup/tokens). Geen wijzigingen in `lib/actions/*`, `lib/data/*`, routes of schema.

### Fase A — Fundament: tokens + shell (~1 sessie)

- `app/layout.tsx` — Instrument Serif laden (`--font-serif`, 400 + italic).
- `app/globals.css` — nieuwe tokenset (dark + light): `--pos/--neg/--warm/--primary-soft/--surface-2`, `--radius: 0.875rem`, kaart-shadow weg in dark, utilities `.kicker` en `.hairline`.
- `components/ui/card.tsx` — één recept (ring, 14px, spacing 14px), CardTitle → kicker-stijl.
- `components/page-header.tsx` — masthead-variant, description weg, `mb-4`.
- `components/app-topbar.tsx`, `components/mobile-nav.tsx`, `components/app-sidebar.tsx` — topbar mobiel weg, dock 56px + hairline, actieve navstaat op `--primary-soft`.
- `lib/nav.ts` — `accent`-veld schrappen of uniformeren.
- **Risico: laag.** Puur visueel; letten op dock-hit-targets (min 44px) en safe-area, en contrast-check van `--primary-soft` op beide colorways.

### Fase B — Dashboard + Financiën

- `app/(app)/dashboard/page.tsx` — voorpagina-layout (masthead, groet, vandaag-strip, vel i.p.v. grid); PushToggle → Instellingen.
- `components/dashboard/clock.tsx` — seconde-punt; `components/count-up.tsx` — digit-roll op hero's.
- `components/dashboard/task-tabs.tsx`, `recent-notes.tsx`, `accounts-chart.tsx`, `networth-chart.tsx` — kickers + chartkleuren op tokens.
- `components/finance/finance-view.tsx` — vermogen-hero bovenaan + maandstrip; `stat-card.tsx`, `investments-card.tsx`, `savings-card.tsx`, `budgets-card.tsx`, `transaction-list.tsx`, `recurring-card.tsx`, `cashflow-outlook.tsx`, `finance-charts.tsx` — **alle 13 bestanden met hardcoded emerald/rose → `text-pos`/`text-neg`**.
- **Risico: middel.** Veel raakvlakken maar geen logica; grootste regressierisico is visueel (charts, lock-staat `€ •••`). Per kaart te reviewen.

### Fase C — Rest + polish

- Taken: `components/tasks/tasks-view.tsx`, `task-item.tsx` (categorie-kickers, TE-LAAT-blok, inktpunt-check) — SwipeRow/dnd-logica niet aanraken.
- Notities: index-stijl (serif-titels, maand-kickers); Inbox: triage-rijen met inline-acties, serif-citaten.
- `components/login-form.tsx` + auth-layout, Statistieken, Instellingen, `empty-state.tsx` (serif-stem).
- Micro-interacties: dock-plus-rotatie, dock-label-dim.
- **Risico: laag.** Kleinere, geïsoleerde schermen; inbox-acties zijn bestaande server actions, alleen de knoppen verhuizen.

---

## 7. Twee keuzevragen aan de eigenaar

1. **Het editie-masthead:** elke dag `EDITIE Nº 182 · DI 1 JULI` + groet in serif bovenaan het dashboard — vind je dat een dagelijks plezier of te veel branding? (Alternatief: alleen de klok met seconde-punt als hero, geen masthead.)
2. **Kaarttitels als mono-kickers** (`VERMOGEN`, `BUDGETTEN` in 11px uppercase mono): dít is de meest zichtbare stijlbreuk met shadcn en de grootste ruimtewinst — durven we volledig, of houden we Schibsted-titels en gebruiken we kickers alleen op het dashboard-vel?
