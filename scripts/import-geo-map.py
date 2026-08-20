#!/usr/bin/env python3
"""
Convert Ahmed's entity-ID mapping (CSV or JSON) into data/geo-entity-map.json.

Usage (from repo root):
  python3 scripts/import-geo-map.py path/to/mapping.csv
  python3 scripts/import-geo-map.py path/to/mapping.json

Accepted CSV headers (case-insensitive, best-effort):
  - entity id column:   "geo entity id" | "entity id" | "entityId" | "id"
  - key columns:        "imo" (vessels)  and/or  "name" | "entity" | "entity name"
  - optional type col:  "type" | "kind" | "entity type"  (vessel/company/authority/programme/country)

Matching:
  vessels    -> by IMO if present, else by exact name
  companies  -> by exact name -> company id from data/seed/companies.json
  authorities-> by exact name -> authority id
  countries  -> by exact name -> country id
  programmes -> by programme name as-is
Unmatched rows are reported, never guessed.
"""
import csv, json, sys, os

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

out_path = "data/geo-entity-map.json"
out = json.load(open(out_path, encoding="utf-8"))
for k in ("vessels","companies","authorities","programmes","countries"):
    out.setdefault(k, {})

rows = []
if src.lower().endswith(".json"):
    data = json.load(open(src, encoding="utf-8"))
    rows = data if isinstance(data, list) else [
        {"name": k, "entity id": v} for k, v in data.items()]
else:
    with open(src, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

def col(r, *names):
    low = {k.strip().lower(): v for k, v in r.items() if k}
    for n in names:
        if n in low and str(low[n]).strip(): return str(low[n]).strip()
    return None

matched, unmatched = 0, []
for r in rows:
    eid  = col(r, "geo entity id", "entity id", "entityid", "id")
    imo  = col(r, "imo", "imo number")
    name = col(r, "name", "entity", "entity name")
    typ  = (col(r, "type", "kind", "entity type") or "").lower()
    if not eid:
        unmatched.append(r); continue
    if imo and imo in imo_set:
        out["vessels"][imo] = eid; matched += 1; continue
    key = (name or "").strip().lower()
    placed = False
    order = [typ] if typ in ("vessel","company","authority","country") else ["vessel","company","authority","country"]
    def norm(x):
        import re
        x = re.sub(r"\(.*?\)", "", x)          # drop parentheticals: "(OFAC)"
        return re.sub(r"[^a-z0-9]+", " ", x.lower()).strip()
    for t in order:
        cand = by_name[t].get(key)
        if cand is None and name:
            nk = norm(name)
            hits = [v for k2, v in by_name[t].items() if norm(k2) == nk]
            cand = hits[0] if len(hits) == 1 else None
        if cand is not None:
            key_hit = cand
        if cand is not None:
            section = {"vessel":"vessels","company":"companies","authority":"authorities","country":"countries"}[t]
            out[section][key_hit] = eid; matched += 1; placed = True; break
    if not placed:
        if typ in ("programme","program") or (name and ("eo " in key or "regulation" in key or key.isupper())):
            out["programmes"][name] = eid; matched += 1
        else:
            unmatched.append(r)

json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"matched: {matched}  ->  {out_path}")
if unmatched:
    print(f"UNMATCHED ({len(unmatched)}) — resolve manually:")
    for r in unmatched[:20]: print("  ", r)
