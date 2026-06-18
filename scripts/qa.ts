/**
 * qa.ts — dataset quality gate (LOCAL STRUCTURE ONLY). 4-category eval from ONTOLOGY.md:
 *   factual      — every entity/relation carries an https source (both URLs on a relation)
 *   structure    — every relation resolves to an existing entity; ontology shape holds; IMO check digit
 *   relevance    — no orphans; every vessel is designated; reference-only ports are allowed
 *   completeness — required props present; dates ISO; status model valid; no empty required fields
 *
 * Run:  npx tsx scripts/qa.ts            (reads data/seed)
 * Exits non-zero if any hard check fails — usable as a pre-submit gate.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  Vessel, Company, Country, Port, Authority, Region,
  Designation, OwnershipLink, BeneficialOwnerLink, CompanyLink, ReportedVoyage, Person,
} from "../src/lib/types";

const SRC = process.argv[2] ?? "data/seed";
const read = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8")) as T;

const vessels = read<Vessel[]>("vessels.json");
const companies = read<Company[]>("companies.json");
const persons = read<Person[]>("persons.json");
const countries = read<Country[]>("countries.json");
const regions = read<Region[]>("regions.json");
const ports = read<Port[]>("ports.json");
const authorities = read<Authority[]>("authorities.json");
const designations = read<Designation[]>("designations.json");
const ownership = read<OwnershipLink[]>("ownership.json");
const beneficialOwners = read<BeneficialOwnerLink[]>("beneficialOwners.json");
const companyLinks = read<CompanyLink[]>("companylinks.json");
const reportedVoyages = read<ReportedVoyage[]>("reportedvoyages.json");

const vesselIds = new Set(vessels.map((v) => v.imo));
const companyIds = new Set(companies.map((c) => c.id));
const personIds = new Set(persons.map((p) => p.id));
const countryIds = new Set(countries.map((c) => c.id));
const portIds = new Set(ports.map((p) => p.id));
const authorityIds = new Set(authorities.map((a) => a.id));

type Sev = "error" | "warn";
const issues: { sev: Sev; cat: string; msg: string }[] = [];
const fail = (cat: string, msg: string) => issues.push({ sev: "error", cat, msg });
const warn = (cat: string, msg: string) => issues.push({ sev: "warn", cat, msg });

const isHttps = (u: unknown) => typeof u === "string" && u.startsWith("https://");
const isIsoDate = (d: unknown) =>
  d === null || (typeof d === "string" && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(d));
const imoChecksumOk = (imo: string) => {
  if (!/^\d{7}$/.test(imo)) return false;
  const s = imo.split("").map(Number);
  const sum = s[0] * 7 + s[1] * 6 + s[2] * 5 + s[3] * 4 + s[4] * 3 + s[5] * 2;
  return sum % 10 === s[6];
};
const STATUSES = new Set(["active", "removed", "current-unverified"]);

// ---- 1. factual: sources (a relation must carry BOTH the listing and the predicate-evidence URL) ----
for (const v of vessels) if (!isHttps(v.sourceUrl)) fail("factual", `vessel ${v.imo} (${v.name}) missing https source`);
for (const c of companies) if (!isHttps(c.sourceUrl)) fail("factual", `company ${c.id} missing https source`);
for (const d of designations) if (!isHttps(d.sourceUrl)) fail("factual", `designation ${d.id} missing https source`);
for (const o of ownership) {
  if (!isHttps(o.listingSourceUrl)) fail("factual", `ownership ${o.vesselImo}->${o.companyId} missing listingSourceUrl`);
  if (!isHttps(o.predicateEvidenceUrl)) fail("factual", `ownership ${o.vesselImo}->${o.companyId} missing predicateEvidenceUrl`);
  if (!o.evidenceQuote || o.evidenceQuote.length < 10) fail("factual", `ownership ${o.vesselImo}->${o.companyId} missing evidenceQuote`);
}
for (const p of companyLinks) if (!isHttps(p.sourceUrl)) fail("factual", `companyLink ${p.fromCompanyId}->${p.toCompanyId} missing https source`);
for (const rv of reportedVoyages) if (!isHttps(rv.sourceUrl)) fail("factual", `reportedVoyage ${rv.id} missing https source`);
for (const p of ports) if (!p.referenceOnly && !isHttps(p.codeSourceUrl)) warn("factual", `port ${p.id} missing codeSourceUrl`);

// ---- EXPECTED COUNTS (guards README/DEMO/SOURCES against silent drift) ----
const expect = (cond: boolean, msg: string) => { if (!cond) fail("structure", msg); };
expect(vessels.length === 25, `expected 25 vessels, got ${vessels.length}`);
expect(companies.length === 10, `expected 10 companies, got ${companies.length}`);
expect(designations.length === 35, `expected 35 designations, got ${designations.length}`);
expect(ownership.length === 27, `expected 27 vessel-company relations, got ${ownership.length}`);
const _active = designations.filter((d) => d.currentStatus === "active").length;
const _removed = designations.filter((d) => d.currentStatus === "removed").length;
const _unver = designations.filter((d) => d.currentStatus === "current-unverified").length;
expect(_active === 33, `expected 33 active designations (OFAC + UK), got ${_active}`);
expect(_removed === 2, `expected 2 removed designations, got ${_removed}`);
expect(_unver === 0, `expected 0 current-unverified designations, got ${_unver}`);
// every live-verified OFAC active designation must cite a per-record detail page, never the search homepage
for (const d of designations) {
  if (d.currentStatus === "active" && d.authorityId === "ofac") {
    if (!d.statusSource || !/Details\.aspx\?id=\d+/.test(d.statusSource)) fail("factual", `active OFAC designation ${d.id} lacks a per-record OFAC detail statusSource`);
    if (!d.uniqueId) fail("factual", `active OFAC designation ${d.id} has no uniqueId (UID)`);
  }
}
for (const p of ports) if (!p.referenceOnly && p.lat != null && !isHttps(p.coordinateSourceUrl)) warn("factual", `port ${p.id} has coordinates without a coordinateSourceUrl`);

// ---- 2. structure: relations resolve ----
for (const o of ownership) {
  if (!vesselIds.has(o.vesselImo)) fail("structure", `ownership references unknown vessel ${o.vesselImo}`);
  if (!companyIds.has(o.companyId)) fail("structure", `ownership references unknown company ${o.companyId}`);
}
for (const d of designations) {
  const pool = d.appliesToType === "vessel" ? vesselIds : companyIds;
  if (!pool.has(d.appliesToId)) fail("structure", `designation ${d.id} references unknown ${d.appliesToType} ${d.appliesToId}`);
  if (!authorityIds.has(d.authorityId)) fail("structure", `designation ${d.id} references unknown authority ${d.authorityId}`);
}
for (const p of companyLinks) {
  if (!companyIds.has(p.fromCompanyId)) fail("structure", `companyLink references unknown company ${p.fromCompanyId}`);
  if (!companyIds.has(p.toCompanyId)) fail("structure", `companyLink references unknown company ${p.toCompanyId}`);
}
for (const b of beneficialOwners) {
  const pool = b.ownerType === "person" ? personIds : companyIds;
  if (!pool.has(b.ownerId)) fail("structure", `beneficialOwner references unknown ${b.ownerType} ${b.ownerId}`);
  if (!companyIds.has(b.companyId)) fail("structure", `beneficialOwner references unknown company ${b.companyId}`);
}
for (const rv of reportedVoyages) {
  if (!vesselIds.has(rv.vesselImo)) fail("structure", `reportedVoyage ${rv.id} references unknown vessel ${rv.vesselImo}`);
  if (!portIds.has(rv.originPortId)) fail("structure", `reportedVoyage ${rv.id} references unknown origin port ${rv.originPortId}`);
  if (!portIds.has(rv.destinationPortId)) fail("structure", `reportedVoyage ${rv.id} references unknown destination port ${rv.destinationPortId}`);
}
for (const v of vessels) if (v.flagCountryId && !countryIds.has(v.flagCountryId)) fail("structure", `vessel ${v.imo} unknown flag country ${v.flagCountryId}`);
for (const c of companies) if (c.addressCountryId && !countryIds.has(c.addressCountryId)) fail("structure", `company ${c.id} unknown country ${c.addressCountryId}`);
for (const p of ports) if (p.countryId && !countryIds.has(p.countryId)) fail("structure", `port ${p.id} unknown country ${p.countryId}`);

// ---- 3. relevance: no orphans (reference-only ports are intentional context) ----
const designatedVessels = new Set(designations.filter((d) => d.appliesToType === "vessel").map((d) => d.appliesToId));
for (const v of vessels) if (!designatedVessels.has(v.imo)) warn("relevance", `vessel ${v.imo} (${v.name}) has no designation`);
const referencedCompanies = new Set<string>([
  ...ownership.map((o) => o.companyId),
  ...companyLinks.flatMap((p) => [p.fromCompanyId, p.toCompanyId]),
  ...designations.filter((d) => d.appliesToType === "company").map((d) => d.appliesToId),
  ...beneficialOwners.map((b) => b.companyId),
]);
for (const c of companies) if (!referencedCompanies.has(c.id)) warn("relevance", `company ${c.id} is not referenced by any relation`);
const usedPorts = new Set(reportedVoyages.flatMap((rv) => [rv.originPortId, rv.destinationPortId]));
for (const p of ports) if (!usedPorts.has(p.id) && !p.referenceOnly) warn("relevance", `port ${p.id} (${p.name}) is unused and not marked referenceOnly`);

// ---- 4. completeness: required props + ISO dates + status model ----
for (const v of vessels) {
  if (!v.imo) fail("completeness", `vessel missing IMO: ${v.name}`);
  if (!v.name) fail("completeness", `vessel ${v.imo} missing name`);
  if (!/^\d{7}$/.test(v.imo)) fail("structure", `vessel ${v.imo} IMO is not 7 digits`);
  else if (!imoChecksumOk(v.imo)) fail("structure", `vessel ${v.imo} (${v.name}) fails IMO check digit`);
  if (!v.flagStatus) fail("completeness", `vessel ${v.imo} missing flagStatus`);
  if (!v.flagCountryId && v.flagStatus === "listed") fail("structure", `vessel ${v.imo} flagStatus 'listed' but no flag country`);
}
for (const d of designations) {
  if (!STATUSES.has(d.currentStatus)) fail("structure", `designation ${d.id} invalid currentStatus '${d.currentStatus}'`);
  if (d.currentStatus === "active" && !d.statusVerifiedAt) fail("completeness", `designation ${d.id} is 'active' but has no statusVerifiedAt`);
  if (d.currentStatus === "active" && !isHttps(String(d.statusSource))) fail("completeness", `designation ${d.id} is 'active' but has no statusSource URL`);
  if (d.currentStatus === "removed" && !d.dateRemoved) warn("completeness", `designation ${d.id} is removed but has no dateRemoved`);
  if (!d.nature) fail("completeness", `designation ${d.id} missing nature`);
  if (!isIsoDate(d.designationDate)) fail("completeness", `designation ${d.id} designationDate not ISO: ${d.designationDate}`);
  if (!isIsoDate(d.statusVerifiedAt)) fail("completeness", `designation ${d.id} statusVerifiedAt not ISO: ${d.statusVerifiedAt}`);
}
for (const c of companies) if (!c.name) fail("completeness", `company ${c.id} missing name`);

// duplicate IMOs
const seen = new Set<string>();
for (const v of vessels) {
  if (seen.has(v.imo)) fail("structure", `duplicate vessel IMO ${v.imo}`);
  seen.add(v.imo);
}

// ---- report ----
const errors = issues.filter((i) => i.sev === "error");
const warns = issues.filter((i) => i.sev === "warn");
const byCat = (sev: Sev) => {
  const m: Record<string, number> = {};
  for (const i of issues.filter((x) => x.sev === sev)) m[i.cat] = (m[i.cat] ?? 0) + 1;
  return m;
};
const statusCounts: Record<string, number> = {};
for (const d of designations) statusCounts[d.currentStatus] = (statusCounts[d.currentStatus] ?? 0) + 1;

console.log("Maritime Shadow Fleet — local structural validation");
console.log(`  entities : ${vessels.length} vessels · ${companies.length} companies · ${ports.length} ports (${ports.filter((p) => p.referenceOnly).length} reference-only) · ${authorities.length} authorities`);
console.log(`  relations: ${ownership.length} ownership · ${companyLinks.length} companyLink · ${designations.length} designation · ${reportedVoyages.length} reportedVoyage`);
console.log(`  desig status: ${JSON.stringify(statusCounts)}`);
console.log("");
for (const i of issues) console.log(`  [${i.sev.toUpperCase()}] ${i.cat}: ${i.msg}`);
if (issues.length) console.log("");
console.log(`  errors: ${errors.length} ${JSON.stringify(byCat("error"))}`);
console.log(`  warns : ${warns.length} ${JSON.stringify(byCat("warn"))}`);
console.log(
  errors.length === 0
    ? "\nSTRUCTURAL VALIDATION PASS — local structure only. This does NOT verify source content,\ncurrent (live) sanction status, relation-predicate correctness, owner identity, or Geo dedup."
    : "\nSTRUCTURAL VALIDATION FAIL — fix errors before submission."
);
process.exit(errors.length === 0 ? 0 : 1);
