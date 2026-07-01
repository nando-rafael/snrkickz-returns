# Snrkickz Returns — Fase 2 (ruilen)

Uitbreiding op de Fase 1 returns-portal: naast terugbetalen kan een klant nu
ook **ruilen** voor een andere maat, kleur of ander artikel — met automatische
verrekening van het prijsverschil. Zelfde patroon als je consign-portal:
Next.js, JSON-bestand opslag op een Railway volume, Shopify Admin API via
client-credentials.

## Hoe de ruil-logica werkt

1. Klant levert een artikel in ter waarde van `refundableAmount` = origineel
   bedrag − €7,95 retourkosten (zelfde fee als bij een normale retour).
2. Klant kiest een nieuw artikel met prijs `newPrice`.
3. `priceDifference = newPrice - refundableAmount`

**Als priceDifference > 0** (nieuw artikel is duurder):
- Er wordt een Shopify **draft order** aangemaakt voor het nieuwe artikel,
  met een vaste korting van `refundableAmount`.
- De klant krijgt een factuur-link (via `draftOrderInvoiceSend`) om het
  restbedrag te betalen.
- Ticketstatus: `awaiting_payment`.

**Als priceDifference ≤ 0** (nieuw artikel is gelijk of goedkoper):
- De draft order wordt aangemaakt met een korting gelijk aan de volledige
  prijs van het nieuwe artikel (dus €0 totaal) en meteen voltooid
  (`draftOrderComplete`) — geen betaalactie nodig van de klant.
- Het verschil wordt als **echte refund** teruggestort op de originele
  betaalmethode via `refundCreate`.
- Ticketstatus: `processed`.

Dit voorkomt dat je fee twee keer wordt toegepast en houdt de boekhouding
kloppend: er gaat nooit meer geld terug dan er binnenkwam, min de fee.

## Wat je nodig hebt

Zelfde soort Dev Dashboard app als bij de track-order-api, maar met meer
scopes (voor refunds, draft orders en product-zoeken):

- `read_orders`
- `write_orders` (voor `refundCreate`)
- `read_products` (voor de ruil-zoekfunctie)
- `read_draft_orders`
- `write_draft_orders` (voor `draftOrderCreate` / `draftOrderComplete` /
  `draftOrderInvoiceSend`)

## Setup

```bash
cp .env.example .env
# vul SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, ADMIN_PASSWORD in
npm install
npm run dev
```

## Admin

`/admin` — beveiligd met basic-auth (username `admin`, wachtwoord uit
`ADMIN_PASSWORD`). Daar zie je alle tickets, kun je ze goedkeuren/afwijzen,
en met één knop **"Verwerk via Shopify"** de refund of ruil daadwerkelijk
laten uitvoeren.

## Klant-flow

`/` — lookup (ordernummer + postcode + achternaam) → artikelen kiezen →
ontvangstdatum + reden → ruilen of terugbetalen → (bij ruilen: artikel
zoeken) → bevestigen. Klant krijgt een retournummer en een link naar
`/retour/status/[ticketId]` om de status te volgen.

## Deploy

Zelfde flow als je andere Railway-projecten: GitHub repo aanmaken, bestanden
uploaden (of `git push`), Railway aan de repo koppelen, environment
variables instellen, en zet `DATA_DIR` op een gemount volume (bv. `/data`)
zodat tickets niet verdwijnen bij een herdeploy.

## Let op

- De fee (€7,95) en retourvenster (14 dagen) staan in `lib/config.js` —
  daar aanpassen, niet in de losse routes.
- `refundCreate` vindt zelf de juiste originele transactie/gateway op de
  order — je hoeft niets handmatig te koppelen.
- Voorraad wordt bij een ruil niet automatisch teruggeboekt voor het
  ingeleverde artikel; dat doe je nu nog handmatig bij ontvangst in het
  magazijn. Dat kan een latere fase worden (Fase 3: voorraad-sync).
