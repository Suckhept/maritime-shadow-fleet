// Emit the Geo-schema-mapped CSV export into data/geo-csv/.
// Nine CSVs matching the published World Affairs schema (Vessel type approved 2026-08):
//   vessels, vessel_categories, companies, government_bodies, sanctions_programmes,
//   sanctioned_by_relations, ownership_relations, linked_to_relations, countries.
// Output is byte-compatible with the reviewed export (CRLF, minimal quoting).
import fs from "node:fs";
import path from "node:path";

const SEED = path.join("data", "seed");
const OUT = path.join("data", "geo-csv");
const load = (f: string) => JSON.parse(fs.readFileSync(path.join(SEED, f), "utf-8"));

const vessels = load("vessels.json");
const companies = load("companies.json");
const designations = load("designations.json");
const ownership = load("ownership.json");
const companyLinks = load("companylinks.json");
const countries = load("countries.json");
const authorities = load("authorities.json");

const cmap = new Map<string, string>(countries.map((c: any) => [c.id, c.name]));
const comap = new Map<string, string>(companies.map((c: any) => [c.id, c.name]));
const vmap = new Map<string, string>(vessels.map((v: any) => [v.imo, v.name]));
const amap = new Map<string, string>(authorities.map((a: any) => [a.id, a.name]));

// Controlled vocabulary normalisation (matches the published Vessel category type).
const CAT: Record<string, string> = {
  "Crude oil tanker": "Crude oil tanker",
  "Products tanker": "Oil products tanker",
  "Oil Products Tanker": "Oil products tanker",
  "LNG carrier": "LNG carrier",
};
const ROLE: Record<string, string> = {
  interestHolder: "interest holder",
  beneficialOwner: "beneficial owner",
  registeredOwner: "registered owner",
  ownerOperator: "owner-operator",
};

// python-csv-compatible cell encoding: quote only when needed, escape " as "".
const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const write = (name: string, header: string[], rows: unknown[][]) => {
  const lines = [header, ...rows].map((r) => (r as unknown[]).map(cell).join(","));
  fs.writeFileSync(path.join(OUT, name), lines.join("\r\n") + "\r\n");
  console.log(`wrote data/geo-csv/${name} (${rows.length} rows)`);
};

fs.mkdirSync(OUT, { recursive: true });
// Remove stale outputs so the directory always holds exactly the current export.
const KEEP = new Set([
  "vessels.csv", "vessel_categories.csv", "companies.csv", "government_bodies.csv",
  "sanctions_programmes.csv", "sanctioned_by_relations.csv", "ownership_relations.csv",
  "linked_to_relations.csv", "countries.csv",
]);
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".csv") && !KEEP.has(f)) fs.unlinkSync(path.join(OUT, f));

// 1. Vessels — per the published schema (IMO as Integer).
write("vessels.csv",
  ["Name", "IMO", "MMSI", "Vessel category", "Call sign", "Year built", "Former names", "Flag state", "Name source URL", "Flag source URL", "Alias source URL"],
  vessels.map((v: any) => [
    v.name, parseInt(v.imo, 10), v.mmsi ?? "", CAT[v.vesselType], v.callSign ?? "",
    v.yearBuilt ?? "", (v.aliases ?? []).join("; "), cmap.get(v.flagCountryId),
    v.nameSourceUrl ?? v.sourceUrl ?? "", v.flagSourceUrl ?? "", v.aliasSourceUrl ?? "",
  ]));

// 2. Vessel category entities (controlled vocabulary).
write("vessel_categories.csv", ["Name"],
  [...new Set(Object.values(CAT))].sort().map((c) => [c]));

// 3. Companies (registry-tier enrichment carried with an explicit provenance label).
const westNote = "registry-derived (Equasis/GUR aggregator), below primary source; UK notice states no location";
write("companies.csv",
  ["Name", "IMO company number", "Jurisdiction (incorporation)", "Described as based in", "Address country", "Registered address", "Tax ID", "Registration number", "Source URL", "Jurisdiction provenance"],
  companies.map((c: any) => {
    const west = c.id === "west-maritime-services-and-trading-inc";
    const jur = west ? "Saint Kitts and Nevis" : (c.jurisdiction ?? "");
    const reg = west ? "0035133" : (c.registrationNumber ?? "");
    const prov = west ? westNote
      : (c.jurisdiction && c.jurisdiction !== "not stated in source" ? "primary (issuing action)" : "");
    return [c.name, c.imoCompanyNumber ?? "", jur, c.describedAsBasedIn ?? "",
      cmap.get(c.addressCountryId) ?? "", c.registeredAddress ?? "", c.taxId ?? "", reg,
      c.sourceUrl ?? "", prov];
  }));

// 4. Government bodies.
write("government_bodies.csv", ["Name", "Jurisdiction", "Source URL"],
  authorities.map((a: any) => [a.name, a.jurisdiction ?? "", a.sourceUrl ?? ""]));

// 5. Sanctions programmes as entities.
const progs = [...new Set(designations.map((d: any) => d.program).filter(Boolean))].sort() as string[];
write("sanctions_programmes.csv", ["Name", "Administering authority"],
  progs.map((p) => [p, p.includes("EO1") ? "Office of Foreign Assets Control (OFAC)" : "UK FCDO / OFSI"]));

// 6. Sanctioned-by relations (Designation modelled as a relation).
write("sanctioned_by_relations.csv",
  ["From (entity)", "From type", "To (Government Body)", "Programme", "Designation date", "Status", "Date removed", "Unique ID", "Nature", "Source URL", "Status verified at", "Status source"],
  designations.map((d: any) => [
    vmap.get(d.appliesToId) ?? comap.get(d.appliesToId) ?? d.appliesToId,
    d.appliesToType, amap.get(d.authorityId) ?? d.authorityId, d.program ?? "",
    d.designationDate ?? "", d.currentStatus, d.dateRemoved ?? "", d.uniqueId ?? "",
    d.nature ?? "", d.sourceUrl ?? "", d.statusVerifiedAt ?? "", d.statusSource ?? "",
  ]));

// 7. Ownership relations — four-role controlled vocabulary; linkedTo excluded (not ownership).
const ownRows = ownership.filter((o: any) => ROLE[o.role]);
write("ownership_relations.csv",
  ["Vessel", "Vessel IMO", "Company", "Role", "Confidence", "Evidence date", "Evidence quote", "Listing source URL", "Predicate evidence URL"],
  ownRows.map((o: any) => [
    vmap.get(o.vesselImo), parseInt(o.vesselImo, 10), comap.get(o.companyId), ROLE[o.role],
    o.confidence ?? "", o.evidenceDate ?? "", o.evidenceQuote ?? "",
    o.listingSourceUrl ?? "", o.predicateEvidenceUrl ?? "",
  ]));

// 8. Linked-to relations (generic OFAC "Linked To" + company-company links).
const linked: unknown[][] = ownership
  .filter((o: any) => o.role === "linkedTo")
  .map((o: any) => [vmap.get(o.vesselImo), "vessel", comap.get(o.companyId),
    o.evidenceQuote ?? "", o.listingSourceUrl ?? o.predicateEvidenceUrl ?? ""]);
for (const c of companyLinks) linked.push([
  comap.get(c.fromCompanyId), "company", comap.get(c.toCompanyId), c.note ?? "", c.sourceUrl ?? ""]);
write("linked_to_relations.csv", ["From", "From type", "To", "Nature / evidence", "Source URL"], linked);

// 9. Countries referenced as relation targets.
const used = new Set<string>();
for (const v of vessels) if (v.flagCountryId) used.add(v.flagCountryId);
for (const c of companies) if (c.addressCountryId) used.add(c.addressCountryId);
write("countries.csv", ["Name", "ISO alpha-3"],
  [...used].sort().map((i) => [cmap.get(i), i]));

console.log("done.");
