# Compliance data

All regulatory content on the site is sourced from one file:
[`src/config/compliance.ts`](../src/config/compliance.ts). No component holds its
own copy of a licence number, an address or a risk figure.

## Current status: DRAFT

Every entry is marked `verified: false` and `COMPLIANCE_REVIEWED` is `false`.

The values currently in the file were **lifted verbatim from the components they
were previously hard-coded into** (`Footer.tsx`, `LegalTermsAndContactSection.tsx`).
Nothing was invented, and nothing has been checked against a regulator's public
register.

While the file is in draft:

- A **"Draft — not for publication"** banner renders at the top of every page.
- The header's licence badge does not render at all.
- The footer lists authorisations as *pending verification* rather than
  asserting them.

## Taking it live

1. Confirm or correct each entry in `src/config/compliance.ts`.
2. Set `verified: true` on each entry you have confirmed.
3. Fill the fields that are currently `null` — they have no source in the
   original site:
   - `legalEntity.registrationNumber`
   - `licences[].registerUrl` — the public register page for each licence
   - `productClaims.negativeBalanceProtection`
   - `productClaims.investorCompensationScheme`
   - `riskWarning.lossPercentage` — the firm's own retail loss figure
   - `restrictedJurisdictions`
4. Set `COMPLIANCE_REVIEWED = true`.

`outstandingComplianceItems()` returns everything still missing, and the draft
banner shows the count.

## Why the "REGULATED" badge was gated

The original header displayed a bare `REGULATED` pill naming no authority and no
licence number. An unqualified regulated claim is the specific pattern most
regulators treat as misleading. The badge now renders only when
`canClaimRegulated()` is true, and it always names the authority and number.

## Claims that need a jurisdiction check

`productClaims.maxLeverage` is `1:500`. Retail leverage is capped far lower in
several jurisdictions — 30:1 on major pairs in the EU and UK. The config carries
`maxLeverageAppliesTo` so the qualifier travels with the number; confirm the
wording is correct for the licences actually held.
