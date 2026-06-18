/**
 * normalize.ts — merge raw collector outputs + the curated seed into one dataset,
 * deduplicating on stable keys (IMO for vessels, IMO company number / name for companies).
 *
 * Inputs:  scripts/.raw/*.json   (each: { vessels?, companies?, ownership?, designations? })
 *          data/seed/*.json       (curated, source-backed reference + seed rows)
 * Output:  data/dataset.json      (full Dataset; the explorer can be pointed at this)
 *
 * Run:  npx tsx scripts/normalize.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { Dataset, Vessel, Company, OwnershipLink, Designation } from "../src/lib/types";

const SEED = "data/seed";
const RAW = "scripts/.raw";
const OUT = "data/dataset.json";

const seed = <T>(f: string): T =>
  JSON.parse(fs.readFileSync(path.join(SEED, f), "utf8")) as T;

const base: Dataset = {
  vessels: seed<Vessel[]>("vessels.json"),
  companies: seed<Company[]>("companies.json"),
  persons: seed("persons.json"),
  ports: seed("ports.json"),
  countries: seed("countries.json"),
  regions: seed("regions.json"),
  authorities: seed("authorities.json"),
  designations: seed<Designation[]>("designations.json"),
  ownership: seed<OwnershipLink[]>("ownership.json"),
  beneficialOwners: seed("beneficialOwners.json"),
  companyLinks: seed("companylinks.json"),
  reportedVoyages: seed("reportedvoyages.json"),
};

interface RawPartial {
  vessels?: Vessel[];
  companies?: Company[];
  ownership?: OwnershipLink[];
  designations?: Designation[];
}

const vByImo = new Map(base.vessels.map((v) => [v.imo, v]));
const cKey = (c: Company) => (c.imoCompanyNumber ?? `name:${c.name.toLowerCase()}`);
const cByKey = new Map(base.companies.map((c) => [cKey(c), c]));
const dById = new Map(base.designations.map((d) => [d.id, d]));
const oKey = (o: OwnershipLink) => `${o.vesselImo}|${o.companyId}|${o.role}`;
const oByKey = new Map(base.ownership.map((o) => [oKey(o), o]));

let merged = 0;
if (fs.existsSync(RAW)) {
  for (const file of fs.readdirSync(RAW).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(RAW, file), "utf8")) as RawPartial;
    for (const v of raw.vessels ?? []) {
      if (!vByImo.has(v.imo)) { vByImo.set(v.imo, v); base.vessels.push(v); merged++; }
    }
    for (const c of raw.companies ?? []) {
      if (!cByKey.has(cKey(c))) { cByKey.set(cKey(c), c); base.companies.push(c); merged++; }
    }
    for (const d of raw.designations ?? []) {
      if (!dById.has(d.id)) { dById.set(d.id, d); base.designations.push(d); merged++; }
    }
    for (const o of raw.ownership ?? []) {
      if (!oByKey.has(oKey(o))) { oByKey.set(oKey(o), o); base.ownership.push(o); merged++; }
    }
  }
} else {
  console.log(`(${RAW} not found — emitting seed only. Run collectors first to enrich.)`);
}

fs.writeFileSync(OUT, JSON.stringify(base, null, 2), "utf8");
console.log(`merged ${merged} new rows. vessels=${base.vessels.length} companies=${base.companies.length} designations=${base.designations.length}`);
console.log(`wrote ${OUT}`);
