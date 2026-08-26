#!/usr/bin/env python3
"""
Convert the maintainer's entity-ID mapping (CSV or JSON) into data/geo-entity-map.json.

Usage (from repo root):
  python3 scripts/import-geo-map.py path/to/mapping.csv
  python3 scripts/import-geo-map.py path/to/mapping.json

Accepted columns/keys (case-insensitive; underscores and spaces equivalent):
  - entity id:  geo_entity_id | geo entity id | entity id | entityId | id
  - keys:       imo (vessels)  and/or  name | entity | entity name
  - type:       type | kind | entity type
                (vessel / company / organization / authority / programme / country;
                 vessel_category rows are skipped — categories are not clickable in the UI)

Matching: vessels by IMO first, then exact name; everything else by exact
(case-insensitive) name against data/seed. Unmatched rows are reported, never guessed.
"""
import csv, json, sys, os, re

if len(sys.argv) != 2:
    sys.exit(__doc__)
src = sys.argv[1]
if not os.path.isdir("data/seed"):
    sys.exit("Run from the repo root (data/seed not found).")

seed = lambda f: json.load(open(f"data/seed/{f}", encoding="utf-8"))
vessels = seed("vessels.json"); companies = seed("companies.json")
authorities = seed("authorities.json"); countries = seed("countries.json")
by_name = {
    "vessel":    {v["name"].strip().lower(): v["imo"] for v in vessels},
    "company":   {c["name"].strip().lower(): c["id"] for c in companies},
    "authority": {a["name"].strip().lower(): a["id"] for a in authorities},
    "country":   {c["name"].strip().lower(): c["id"] for c in countries},
}
imo_set = {v["imo"] for v in vessels}
SECTION = {"vessel": "vessels", "company": "companies", "authority": "authorities", "country": "countries"}
TYPE_ALIAS = {"organization": "authority", "organisation": "authority", "org": "authority",
              "vessel": "vessel", "company": "company", "authority": "authority", "country": "country"}
CATEGORY_TYPES = {"vessel_category", "vessel category", "category"}
PROGRAMME_TYPES = {"programme", "program"}

out_path = "data/geo-entity-map.json"
out = json.load(open(out_path, encoding="utf-8")) if os.path.exists(out_path) else {"spaceId": "89bd89bf28ff8a0963faf92a8c905e20"}
for k in ("vessels", "companies", "authorities", "programmes", "countries"):
    out.setdefault(k, {})

if src.lower().endswith(".json"):
    data = json.load(open(src, encoding="utf-8"))
    rows = data if isinstance(data, list) else [{"name": k, "id": v} for k, v in data.items()]
else:
    rows = list(csv.DictReader(open(src, encoding="utf-8-sig")))

def col(r, *names):
    low = {k.strip().lower().replace("_", " "): v for k, v in r.items() if k}
    for n in names:
        if n in low and str(low[n]).strip():
            return str(low[n]).strip()
    return None

def norm(x):
    x = re.sub(r"\(.*?\)", "", x)
    return re.sub(r"[^a-z0-9]+", " ", x.lower()).strip()

matched, skipped, unmatched = 0, 0, []
for r in rows:
    eid  = col(r, "geo entity id", "entity id", "entityid", "id")
    imo  = col(r, "imo", "imo number")
    name = col(r, "name", "entity", "entity name")
    typ  = (col(r, "type", "kind", "entity type") or "").lower()
    if not eid:
        unmatched.append(r); continue
    if typ in CATEGORY_TYPES:
        skipped += 1; continue                      # categories aren't clickable entities in the UI
    if imo and imo in imo_set:
        out["vessels"][imo] = eid; matched += 1; continue
    key = (name or "").strip().lower()
    if typ in PROGRAMME_TYPES and name:
        out["programmes"][name] = eid; matched += 1; continue
    placed = False
    order = [TYPE_ALIAS[typ]] if typ in TYPE_ALIAS else ["vessel", "company", "authority", "country"]
    for t in order:
        hit = by_name[t].get(key)
        if hit is None and name:
            nk = norm(name)
            hits = [v for k2, v in by_name[t].items() if norm(k2) == nk]
            hit = hits[0] if len(hits) == 1 else None
        if hit is not None:
            out[SECTION[t]][hit] = eid; matched += 1; placed = True; break
    if not placed:
        if name and ("eo " in key or "regulation" in key or key.isupper()):
            out["programmes"][name] = eid; matched += 1
        else:
            unmatched.append(r)

json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"matched: {matched}  |  skipped (vessel categories): {skipped}  ->  {out_path}")
if unmatched:
    print(f"UNMATCHED ({len(unmatched)}) — resolve manually:")
    for r in unmatched[:20]: print("  ", dict(r))
else:
    print("clean — commit data/geo-entity-map.json and push.")
