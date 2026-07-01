# ONRAJ Redesign — "Warm Precies" (v2)

*Richting gekozen door Jarno (juli 2026): strak/modern, Linear-achtig, warme identiteit behouden,
strakke grotesk-titels. De eerdere editorial/krant-richting ("De Editie") is verworpen —
geen serif, geen masthead, geen mono-kickers als kaarttitels.*

---

## 1. Visie

ONRAJ wordt **warm precies**: de dichtheid en precisie van Linear, maar op de warme
near-black + crème-identiteit die van ONRAJ ONRAJ maakt. Geen decoratie — de kwaliteit zit
in uitlijning, ritme, hairlines en rust. Denim is de enige kleur die "aan" mag staan;
geld praat in flesgroen/terracotta; al de rest is crème op near-black.

**Referentie:** Linear. **Niet:** kranten, serif, glas-effecten, module-regenbogen.

## 2. Systeem

- **Tint (behouden):** `#141416` achtergrond · `#1C1C1F` kaart · crème `#ECE7DF` · muted `#9A948B`.
- **Geld-tokens (behouden):** `--pos #5FAE8C` / `--neg #E08573` / `--warm #D6A05A` — overal via
  `text-pos`/`text-neg`, nooit meer hardcoded emerald/rose.
- **Denim:** `--primary #3D68BE` voor knoppen/vlakken; `--primary-soft #6D90D8` voor
  links/actieve labels (contrast). Max drie denim-momenten per scherm.
- **Typografie:** Schibsted (koppen + kaarttitels 13px/500 muted), Hanken (body 15/13px),
  JetBrains Mono (uitsluitend cijfers/bedragen/datums, tabular-nums). Geen serif.
- **Kaartrecept:** `bg-card ring-1 ring-foreground/8 rounded-lg` (12px), spacing 14px,
  vlak in dark (geen schaduw), zweem-schaduw in light. Kaarttitel: 13px Schibsted medium muted;
  de inhoud (cijfers, namen) is visueel de baas, niet de titel.
- **Radius:** controls 8–10px · kaarten/velden 12px · dialogen/sheets 16–18px · dock/pills full.
- **Dichtheid:** lijstregels 40–44px, meta rechts op dezelfde regel in mono, secties `space-y-5`,
  één titel per scherm (geen beschrijvingsregels).
- **Beweging:** kort en functioneel (120–200ms): hover-ring, rij-highlight, checkbox-spring.
  Geen pulserende decoratie.

## 3. Per scherm (fase B/C)

- **Dashboard:** subtiele klok blijft de hero; daaronder een dicht "vandaag"-overzicht
  (taken vandaag/te laat + saldo-regel), dan vermogen + saldo als precieze statblokken,
  recente notities als dichte lijst. Kaarten blijven, maar strakker en dichter.
- **Financiën:** vermogen prominenter bovenaan (groot mono-cijfer + sparkline + %-badge in pos/neg),
  maandstrip (in/uit/saldo) als één regel, transactielijst dichter met bedragen rechts uitgelijnd.
- **Taken:** dichte rijen, categorie als sectiekop (13px medium), "te laat" in `--neg`,
  deadline rechts in mono.
- **Notities/Inbox:** dichte lijsten i.p.v. luchtige kaarten; inline-acties in de inbox-rij.
- **Login:** wordmark + formulier, één denim-knop, verder kaal.

## 4. Status

- **Fase A (fundament) — gedaan:** tokens (pos/neg/warm/primary-soft/surface-2, hairlines,
  vlakke kaarten in dark), radius-schaal, één kaartrecept, PageHeader zonder beschrijving,
  slank dock (56px, ring, + in het dock), contrast-fix actieve labels.
- **Fase A2 (koerscorrectie) — gedaan:** kickers → strakke 13px-titels, serif verwijderd,
  radius aangescherpt naar 12px, geld-kleuren-sweep (emerald/rose → pos/neg, ~15 bestanden).
- **Fase B — volgende:** dashboard + financiën volgens §3.
- **Fase C:** taken/notities/inbox/login + micro-interacties.
