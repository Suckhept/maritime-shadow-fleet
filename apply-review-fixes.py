#!/usr/bin/env python3
"""
Apply Ahmed's 5 review fixes to data/seed/*.json.
Run from the repo root:  python3 apply-review-fixes.py
Then:  git add data/seed && git commit -m "Review fixes: vessel type, listing status, Mulan alias/year, West Maritime location, UK verify date" && git push
"""
import json, os, sys

SEED = "data/seed"
if not os.path.isdir(SEED):
    sys.exit("Run this from the repo root (data/seed/ not found).")

def load(f): return json.load(open(os.path.join(SEED, f), encoding="utf-8"))
def save(f, d): json.dump(d, open(os.path.join(SEED, f), "w", encoding="utf-8"),
                          ensure_ascii=False, indent=2)

changed = []

# --- vessels.json ---
ves = load("vessels.json")
for v in ves:
    if v["imo"] == "9277735":                       # Fix 1: OFAC/FR = "Oil Products Tanker"
        v["vesselType"] = "Oil Products Tanker"; changed.append("Lunar Tide vesselType -> Oil Products Tanker")
    if v["imo"] == "9334038":                       # Fix 2: delisted 2024-04-26, align listing status
        v["flagStatus"] = "delisted"; changed.append("Yasa Golden Bosphorus listing status -> delisted")
    if v["imo"] == "9864837":                       # Fix 3: Arctic Mulan (ex-Mulan) + build year
        v["aliases"] = ["Arctic Mulan"]
        v["aliasSourceUrl"] = "https://war-sanctions.gur.gov.ua/en/transport/ships/309"
        v["yearBuilt"] = 2024
        changed.append("Mulan alias 'Arctic Mulan' + yearBuilt 2024")
save("vessels.json", ves)

# --- companies.json ---  Fix 4: West Maritime location not in UK notice
com = load("companies.json")
for c in com:
    if c["id"] == "west-maritime-services-and-trading-inc":
        c["jurisdiction"] = "not stated in source"
        c["describedAsBasedIn"] = "not stated in source"
        c["registeredAddress"] = "not stated in source"
        c["jurisdictionSourceType"] = (
            "Not stated in the UK ship specification (10 Feb 2026). Registry aggregator "
            "(Ukraine GUR, Equasis-derived) reports Saint Kitts and Nevis, reg. 0035133; "
            "not promoted pending primary-source (Equasis/GISIS) confirmation.")
        changed.append("West Maritime location fields -> 'not stated in source'")
save("companies.json", com)

# --- designations.json ---  Fix 5: UK Lunar Tide independent re-verification
des = load("designations.json")
for d in des:
    if d["appliesToId"] == "9277735" and d["listName"] == "UK Sanctions List":
        d["statusVerifiedAt"] = "2026-06-18"  # date of live-list re-check; update if you finalise later
        d["statusSource"] = "https://www.gov.uk/government/publications/the-uk-sanctions-list"
        changed.append("UK Lunar Tide statusVerifiedAt -> live-list re-check")
save("designations.json", des)

print("Applied %d fixes:" % len(changed))
for c in changed:
    print("  -", c)
