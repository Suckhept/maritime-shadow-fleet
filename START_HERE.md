# START HERE — reading guide

**What this is:** a GRC-20 knowledge-graph dataset + a Next.js explorer mapping the maritime
"shadow fleet" — sanctioned oil tankers → the companies tied to them → their designations and one
reported voyage. Every sanctions fact is primary-sourced (OFAC / UK).

## Read in this order
1. **`README.md`** — overview, live counts, how sanction status is modelled, what is verified vs pending.
2. **`DEMO.md`** — one tanker traced end to end. The fastest way to understand the model.
3. **`ONTOLOGY.md`** — the entity / field / predicate model (GRC-20 / Geo shape).
4. **`data/SOURCES.md`** — every source, and what is *not* verified.

## The data (the substance)
Canonical dataset = **`data/seed/*.json`** (the single source of truth; everything else is generated):
- `vessels.json` — ships, IMO-keyed; the flag has its own `flagSourceUrl`.
- `companies.json` — companies; `jurisdiction` is set only when an official registration ID exists.
- `designations.json` — sanction records: `currentStatus`, `authorityId` (`ofac` / `uk-fcdo`), `program`,
  `uniqueId` (OFAC UID), `statusSource` (the per-record OFAC page), `statusVerifiedAt`.
- `ownership.json` — **vessel↔company links — the core.** Each link carries **two URLs**:
  `listingSourceUrl` (the action that lists both together) and `predicateEvidenceUrl` (the document that
  proves the predicate), plus `evidenceQuote`, `evidenceDate`, `role`, and `roleCurrency`.

> Read one link as: **vessel X → role R to company Y, because document Z (`predicateEvidenceUrl`) states
> verbatim "…`evidenceQuote`…".**

- `data/ofac-verification.json` — per-record UID + date + source (proof every status was checked against
  the live OFAC Sanctions List Search on 2026-06-15).
- `data/geo-csv/*.csv` — the same data, flat, as a Geo-import candidate (one row per entity).

## Run the explorer
```bash
nvm use            # Node 22.22.2 (pinned in .nvmrc)
npm ci
npm run dev        # http://localhost:3000
```
Five views: `/` overview · `/map` · `/network` · `/trace` (one vessel end to end) · `/risk` (screening signals).
A clean build log is in `docs/build-log.txt`.

## Verify it yourself
```bash
npm run data:qa      # structure + IMO check-digit + count assertions  → 0 errors / 0 warnings
npm run check:docs   # prose/seed consistency
npm run typecheck    # tsc --noEmit
npm audit            # 0 vulnerabilities
```

## Status
Counts and the "verified vs pending" breakdown live in `README.md`. This is a **pilot subset**;
post-submission enrichment (Equasis/GISIS role verification, exhaustive Geo dedup, terminal-level
coordinates, broader voyage coverage) is listed there as honest limitations — not blockers.
