# Ontology (GRC-20) & Geo mapping

The dataset is modelled as typed entities + typed relations, designed to map onto Geo / GRC-20. The
CSVs under `data/geo-csv/` are a **Geo-oriented candidate export** — not a "Geo-ready" import (see the
honest gaps at the end).

## Entity types

- **Vessel** — `imo` (primary key; 7-digit + check digit), `name`, `mmsi`, `vesselType`,
  `flagCountryId`, **`flagStatus`** (`listed | removed-from-source | unknown`), `yearBuilt`,
  `callSign`, `sourceUrl`. (There is no denormalised `status` field — a vessel's status is derived
  from its designations' lifecycle.)
- **Company** — `name`, `imoCompanyNumber`, **`jurisdiction`** (jurisdiction of incorporation —
  filled *only* from **official registration identifiers** (Tax ID / registration number) present in the
  cited action, recorded via `jurisdictionSourceType = official-registration-id`; **never** from a mere
  address or a "based in" description), **`describedAsBasedIn`** (a country a sanctions source merely
  "describes as based in"; never promoted to incorporation), `addressCountryId` (listed-address
  country, not a place of control), `registeredAddress`, **`taxId`**, **`registrationNumber`**, `lei`,
  `sourceUrl`.
- **Authority**, **Country**, **Region**, **Port** (`unlocode` from the **UNECE LOCODE service**
  (`codeSourceUrl`); **coordinates are separately-sourced, approximate, secondary** points
  (`coordinateSourceUrl`, `coordinateStatus = approximate`, `coordinateSourceType = secondary`) — a
  city/area centroid, **not** a surveyed terminal position; `sourceUrl` is the UNECE location source — distinct from the
  voyage source on a ReportedVoyage; `referenceOnly` ports are not plotted by default and none ship in
  this subset), **Person** (none in scope).

## Relation types

- **OwnershipLink** (vessel↔company): `role` ∈ `registeredOwner | beneficialOwner | interestHolder |
  ownerOperator | operator | shipManager | ismManager | linkedTo`; `confidence`; and the
  **provenance split** — `listingSourceUrl` (the action listing both entities) + `predicateEvidenceUrl`
  (the document that proves *this* predicate) + `evidenceQuote` + `evidenceDate`. The predicate is
  never stronger than the proving document: a bare OFAC "Linked To" is `linkedTo`; "registered owner"
  is `registeredOwner`; OFAC "property in which X has an interest" is `interestHolder`; UK "owner
  operators" is `ownerOperator`.
- **CompanyLink** (company↔company): endpoints are the **neutral** `fromCompanyId` / `toCompanyId`
  (no parent→child direction is implied for a non-directional link); `relation` ∈ `parentOf | linkedTo
  | controlledBy | beneficialOwnerOf`. `parentOf` is reserved for a registry/shareholder/equity
  statement; an OFAC "Linked To" between two companies is `linkedTo` (this is why Arctic LNG 2 →
  Gotik/Plio is `linkedTo`, not `parentOf`).
- **Designation** (vessel|company): `nature` (`binding-sanction | research-designation`), `program`,
  `designationDate`, **`currentStatus`** (`active | removed | current-unverified`),
  **`statusVerifiedAt`**, **`statusSource`**, **`dateRemoved`** (set for `removed`), `authorityId`,
  `uniqueId`, `statementOfReasons`, `sourceUrl`. A shared renderer maps the three states to distinct
  colour + label so a `removed` listing never reads as an active sanction.
- **ReportedVoyage** (replaces the old PortCall endpoints): `originPortId`, `destinationPortId`,
  `reportedPeriod`, `timeGranularity` (`exact|day|month|year|unknown`), `observationType`
  (`AIS | ais-derived | secondary-analysis | reported-in-listing | research-report`), `sourceUrl`.
  This makes explicit that the single voyage is a **month-level, secondary-sourced** observation, not
  two AIS-confirmed port-call events with timestamps.

## Property vs block content (Geo authoring)

Structured/typed data (dates, URLs, numbers, IDs, relations) → **Properties**; narrative/images →
**block content**. Required properties are never left empty.

## CSV export conventions

One entity per row; dates `YYYY-MM-DD`; full `https://` URLs; UTF-8; relations reference the canonical
entity **name** (Geo resolves relations by name). Files: `vessel`, `company`, `designation`,
`authority`, `country`, `region`, `port`, `ownership`, `companylink`, `reportedvoyage`,
`beneficialowner`.

## Why this is a *candidate* export, not "Geo-ready"

Not yet done, and required before claiming a Geo import:

1. **Entity resolution / dedup** against entities already in the target Geo spaces (by IMO, company
   registration number, UN/LOCODE) — no merge has been attempted.
2. **Live Geo entity IDs** — none are bound; CSVs resolve by name only.
3. **Confirmed Type / Property IDs** in the target space.
4. A reproducible **GRC-20 operation manifest** (create/update/relation ops) with a match-merge-create
   report.

Until those exist, this is a *Geo-oriented candidate CSV export*.

## Scope: an honest pilot subset

This is a source-faithful pilot, not a complete ownership/UBO graph: one `ReportedVoyage`, zero
`Person`, zero `BeneficialOwnerLink`, no registry-confirmed manager/operator chains, and the
company-to-company links are OFAC `linkedTo` (co-listing), not equity ownership. Expanding to
registry-confirmed UBO chains requires Equasis / IMO GISIS + corporate-registry passes (listed under
"not verified here" in the README).
