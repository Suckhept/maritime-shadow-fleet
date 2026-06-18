# Sources & verification

**Sanctions and corporate-link assertions are primary-source-backed**; the reported voyage and port
coordinates carry **separately-labelled secondary** provenance (see below). **Source tiers:** (1) issuing
authority — OFAC SDN actions / Treasury press releases, the UK Sanctions List notices; (2) corporate
registries — Equasis / IMO GISIS (registry owner verification is **pending login**, see Job B); (3)
research/secondary — Brookings, KSE Institute, and (for port coordinates) geographic references, all
clearly marked and never used to assert a binding sanctions fact.

## Sanction status model

A listing **event** is sourced for every record. `currentStatus` ∈ `active | removed |
current-unverified`. **All OFAC records were re-checked on the live Sanctions List Search (2026-06-15)**;
the `current-unverified` state exists in the model but **no record currently uses it**. **Lunar Tide**
is `active` (dated UK notice, 10 Feb 2026). **Yasa Golden Bosphorus** and **Ice Pearl Navigation Corp**
are `removed` (OFAC delisting, 26 Apr 2024) — shown distinctly (grey), never as a current sanction.

## Relations — predicate evidence

Predicates are matched to the wording of a **proving document**, stored as `predicateEvidenceUrl`
separately from the `listingSourceUrl` (the action that lists the entities together).

- **Sovcomflot — `interestHolder` ×14.** Listing: OFAC Recent Actions 20240223. Predicate proof:
  Treasury press release **jy2121** — "identifying 14 crude oil tankers as property in which Sovcomflot
  has an interest. These vessels, all of which are beneficially owned by Sovcomflot…". Registered
  owner/manager not asserted (would require Equasis / GISIS).
- **Hennesea — `beneficialOwner` ×5.** Listing: OFAC Recent Actions 20240118. Predicate proof:
  Treasury press release **jy2028** — "all of which are beneficially owned by Hennesea, as property in
  which Hennesea has an interest".
- **SCF Primorye, Yasa Golden Bosphorus — `registeredOwner`.** Listing: OFAC Recent Actions 20231012.
  Predicate proof: Treasury press release **jy1795** — "Lumber Marine SA is the registered owner of the
  SCF Primorye"; "Ice Pearl Navigation Corp is the registered owner of the Yasa Golden Bosphorus".
  **Note:** Yasa Golden Bosphorus and Ice Pearl were **delisted on 26 Apr 2024** (see below); SCF
  Primorye / Lumber Marine were **not** removed.
- **Viktor Bakaev — `registeredOwner`.** Listing: OFAC Recent Actions 20231201. Predicate proof:
  Treasury press release **jy1940** — UAE-based **Streymoy Shipping Limited** is the registered owner.
  Flag Liberia, MMSI 636015565. (S&P reports ultimate control by Sovcomflot — secondary; recorded as a
  note, not an edge.)
- **Mulan → Plio, New Energy → Gotik — `linkedTo`.** Listing = predicate proof: OFAC Recent Actions
  20240905 SDN entries tag each vessel "Linked To" the company; no stronger claim is made.
- **Lunar Tide → West Maritime — `ownerOperator`.** Source: UK Sanctions List correction notice
  (10 Feb 2026), "Current owner operators: WEST MARITIME SERVICES AND TRADING INC".

## Company designations

- **Arctic LNG 2 LLC** — included **2 Nov 2023** (OFAC 20231102): "LIMITED LIABILITY COMPANY ARCTIC
  LNG 2 … Novy Urengoi 629309, Russia; Tax ID No. 8904075357; Registration Number 1148904001278
  [RUSSIA-EO14024]". The 5 Sep 2024 action is used **only** for the Gotik / Plio → Arctic LNG 2 links.
- Sovcomflot (20240223), Hennesea (20240118), Streymoy (jy1940/20231201), Lumber Marine (20231012),
  Gotik & Plio (20240905) are each self-listed and **live-confirmed `active` (2026-06-15)**; Ice Pearl
  (20231012) is **`removed`** (delisted 2024-04-26).

## Lunar Tide — UK correction (10 Feb 2026), UID RUS2841

Still subject to UK sanctions (owner-operator West Maritime; date designated 21 Jul 2025; last updated
10 Feb 2026; built 2004). The UK notice struck an erroneous flag value (**"Tazmania"**) without
replacement. The **flag recorded in the dataset is Guinea**, sourced from the OFAC entry (see the
dual-listing section above), with `flagSourceUrl` pointing to OFAC — not the UK notice.

## Delistings

- **Kept as historical cases (`currentStatus = removed`).** OFAC Recent Actions **20240426** deleted
  exactly two entries: **Ice Pearl Navigation Corp** (IMO co. 4118745) and the vessel **Yasa Golden
  Bosphorus** (IMO 9334038, "Linked To: Ice Pearl Navigation Corp"). Both carry `dateRemoved =
  2024-04-26`, `statusVerifiedAt = 2024-04-26`, `statusSource = 20240426`. The Oct-2023 designation +
  jy1795 registered-owner relation remain as the historical record.
- **Removed entirely (out of scope).** Four Venezuela-linked tankers and their owners delisted by OFAC
  in 2020 (e.g. Athens Voyager, Chios I — FR 2020-13586, "no longer subject to blocking"; others
  July 2020).

## Ports — code vs coordinate vs voyage source

The **UN/LOCODE** is proved by the **UNECE LOCODE service** (`codeSourceUrl`): `RU PRI` Primorsk,
`CN ZOS` Zhoushan. The UNECE rows for these codes **do not carry coordinates** (the `3001N 12206E`
near CN ZOS belongs to a different row, `CN MAJ`), so **coordinates are sourced separately**
(`coordinateSourceUrl`) and flagged `coordinateStatus = approximate`: Primorsk ≈60.333 N, 28.717 E
(Port of Primorsk); Zhoushan ≈29.986 N, 122.207 E (Zhoushan municipal seat). Brookings is **not** a
source for codes or coordinates — it sources the **voyage** only (Viktor Bakaev Primorsk → Zhoushan,
July 2024, month-level). The three reference-only context ports were removed.

## Jurisdiction vs "based in"

A sanctions notice saying a company is *"UAE-based"* (Streymoy, Hennesea, Lumber Marine) or
*"Turkiye-based"* (Ice Pearl) is recorded as `describedAsBasedIn`, **not** as
`jurisdictionOfIncorporation`. Incorporation (`jurisdictionOfIncorporation`) is filled only from **official registration identifiers
present in the cited OFAC action** — Sovcomflot (Tax ID 7702060116, registration 1027739028712, LEI
253400DYLWR5A6YAWJ69) and Arctic LNG 2 (Tax ID 8904075357, registration 1148904001278). This is an
official-identifier source, not a corporate-registry pull; elsewhere incorporation is null.

## Live OFAC status — verified 2026-06-15

All OFAC SDN records were re-checked against the **live OFAC Sanctions List Search**
(`https://sanctionssearch.ofac.treas.gov/`) on **2026-06-15** (SDN List version **2026-06-11**):
vessels by exact-IMO lookup (a single IMO hit is inherently IMO-confirmed), companies by name/UID. Outcome:

- **All OFAC records confirmed currently listed → `active`** (`statusVerifiedAt = 2026-06-15`), each with
  its own per-record OFAC detail page (`Details.aspx?id=<UID>`) as `statusSource` — no record falls back
  to the search homepage. This includes **NS Consul** (IMO 9341093, UID 47003), previously event-only.
- **Yasa Golden Bosphorus** (9334038) and **Ice Pearl Navigation Corp** (4118745, also checked by IMO
  co. number) returned **0 results → `removed`** (delisted 2024-04-26) — independent re-confirmation.
- **West Maritime Services and Trading Inc** returns **0 OFAC results** — consistent with it being a
  **UK-only** listing reference (UID RUS2841), not an OFAC entity.
- **Winky International Limited** confirmed **`active`** — OFAC UID **56723**, `VENEZUELA-EO13850`
  (designation independently confirmed here via OFAC Recent Actions 20251231 and press release sb0348;
  the live SLS record carries UID 56723, adjacent to the linked vessel ROSALIND's 56724).

The complete per-record UID → detail-URL → date map is committed as **`data/ofac-verification.json`**
(every vessel + company UID, `verifiedAt = 2026-06-15`, SDN List version 2026-06-11). New Energy (UID
50628) was independently re-fetched from OFAC and matched (IMO 9324277, RUSSIA-EO14024, Linked To Gotik).

## Lunar Tide / Rosalind — one hull, two listings (IMO 9277735)

The same vessel carries **two distinct, primary-sourced designations**:

- **UK**, Russia regime: *Lunar Tide*, UID **RUS2841**, owner-operator **West Maritime**, active
  (UK notice 2026-02-10).
- **OFAC**, Venezuela regime (`VENEZUELA-EO13850`): *ROSALIND (a.k.a. Lunar Tide)*, **Guinea flag**,
  listed **2025-12-31**. The SDN Recent-Actions line states only *"(Linked To: WINKY INTERNATIONAL
  LIMITED)"*; the Treasury **press release sb0348** is the document that names Winky as ROSALIND's
  **registered owner** (*"whose registered owner is Winky International Limited"*) and identifies the
  vessel as *"blocked property in which Winky International Limited has an interest"*. Both wordings are
  recorded as separate dated relations — **`registeredOwner`** and **`interestHolder`** — with
  `predicateEvidenceUrl = sb0348`. Winky — Marshall Islands, registration 128617, established 2024-11-01,
  UID 56723.

**Source discrepancy (deliberately not collapsed):** OFAC (2025-12-31, sb0348) calls **Winky** the
*registered owner*; the UK notice (2026-02-10) calls **West Maritime** the *current owner-operators* of
the same hull. Without a registry (Equasis/GISIS) pass these are not reconciled — all three relations
carry `roleCurrency = unverified` and a "possible role change / source discrepancy" note, rather than
picking one as the current owner. The **flag is Guinea** per the OFAC entry (`flagSourceUrl` → OFAC); the
later UK notice struck an erroneous value without a replacement.

## Geo dedup (read-only, geobrowser.io)

Checked via the Geo app global search (World affairs / Root). Findings: (1) Geo search is **not indexed
by IMO** — IMO queries return no results, so dedup must be by **name**; (2) name searches for these
vessels and companies surface only **news "Claim" entities** (e.g. Anatoly Kolodkin, Sovcomflot,
Hennesea), **not structured Vessel/Company entities** — the Maritime Shadow Fleet dataset is **not yet
present**. **Sampled dedup found no structured matches; full entity-by-entity resolution remains pending** — the create/no-merge result is **not** extrapolated to the whole dataset. (See
`GEO_DEDUP.md`.)

## Not executable from this environment

- **Equasis / IMO GISIS** registered owner / ISM manager / operator + role dates — both require an
  account login; the browser pass could not authenticate, so the 14 Sovcomflot vessels remain
  `interestHolder` (OFAC's exact wording, "property in which Sovcomflot has an interest"), not upgraded
  to `registeredOwner`. This is a completeness gap, not a correctness one.
- A public GitHub Actions run under the pinned Node (the workflow + a local clean build log are
  committed).
- Live Geo **writes** / a reproducible import manifest (needs Geo credentials + the contributor slot).
- Browser rendering (WebGL / Cytoscape / edge panels / mobile).

## Key source URLs

- OFAC 20231012 · jy1795 · 20231102 · 20231201 · jy1940 · 20240118 · jy2028 · 20240223_33 · jy2121 · 20240905
- UK notice (10 Feb 2026): assets.publishing.service.gov.uk/media/698b59868492b54795c1be6d/Sanctions_Notice__Russia__10_February_2026.pdf
- Brookings (reported voyage, secondary, month-level).
