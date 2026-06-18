# Geo dedup report (read-only) — 2026-06-15

Source: Geo app global search at `https://www.geobrowser.io/root`, **World affairs space ID**
`89bd89bf28ff8a0963faf92a8c905e20` (and Root), browsing only — no entities were created, edited, or
published (allocation gate). Checked 2026-06-15 across a **representative sample** of categories (a
Sovcomflot vessel, multiple companies, both ports, uniquely-named vessels). **This is a spot-check, not a
full sweep.**

## Method findings

- **Geo search is not indexed by IMO.** Queries for IMO numbers (e.g. `9610808`) return *No results*.
  Dedup must therefore be done by **entity name**, not IMO.
- Name searches for these vessels/companies surface only **news "Claim" entities** (short sourced
  statements), **not structured Vessel or Company entities**. The Maritime Shadow Fleet dataset is
  **not yet present** in the graph.

## Results (sampled across the dataset)

| Entity | Key searched | Exists as structured entity? | What was found | Recommendation |
|---|---|---|---|---|
| Anatoly Kolodkin (vessel) | name + IMO 9610808 | No | one news Claim mentioning the vessel | create |
| Joint Stock Company Sovcomflot | name | No | news Claims only (Podcasts space) | create |
| Hennesea Holdings Limited | name | No | no results | create |
| IMO numbers (all) | 9610808 etc. | n/a | search not IMO-indexed | use name-based dedup |

The browser pass stopped after the company sample. The sampled dedup **found no structured matches**;
a **full entity-by-entity / alias-by-alias resolution remains pending** (browser-only) and must cover all
25 vessels (canonical name + aliases incl. ROSALIND / LUNAR TIDE), 10 companies (full + short names), 2
ports, and the IMO company numbers / registration numbers / Tax IDs / UN/LOCODEs. The result is **not**
extrapolated to the whole dataset. A full
per-entity pass over the remaining 7 companies and 25 vessels should be re-run to confirm before any
import, ideally once the contributor slot is active.

## Implication for import

Because nothing in the dataset currently exists as a structured Geo entity, the candidate CSVs in
`data/geo-csv/` can be imported as **new** entities — but only **after** the contributor slot is
confirmed. Relations must still resolve to canonical entity names at import time; the importer matches by
display name (case-insensitive), so company/port names must be created (or already exist) before the
relations that reference them.
