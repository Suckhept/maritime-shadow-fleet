/**
 * to-geo-csv.ts — emit Geo CSV import templates (one file per type).
 *
 * Conventions enforced (see ONTOLOGY.md):
 *  - one entity per row; dates YYYY-MM-DD; full https URLs; UTF-8
 *  - relation columns reference the canonical entity NAME (Geo resolves by name)
 *  - names: sentence case, official full name, no parenthetical annotations
 *
 * Run:  npx tsx scripts/to-geo-csv.ts [sourceDir=data/seed] [outDir=data/geo-csv]
 */
import fs from "node:fs";
import path from "node:path";
import type {
  Vessel, Company, Country, Region, Port, Authority,
  Designation, OwnershipLink, BeneficialOwnerLink, CompanyLink, ReportedVoyage, Person,
} from "../src/lib/types";

const SRC = process.argv[2] ?? "data/seed";
const OUT = process.argv[3] ?? "data/geo-csv";

const read = <T>(f: string): T =>
  JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8")) as T;

const vessels = read<Vessel[]>("vessels.json");
const companies = read<Company[]>("companies.json");
const persons = read<Person[]>("persons.json");
const ports = read<Port[]>("ports.json");
const countries = read<Country[]>("countries.json");
const regions = read<Region[]>("regions.json");
const authorities = read<Authority[]>("authorities.json");
const designations = read<Designation[]>("designations.json");
const ownership = read<OwnershipLink[]>("ownership.json");
const beneficialOwners = read<BeneficialOwnerLink[]>("beneficialOwners.json");
const companyLinks = read<CompanyLink[]>("companylinks.json");
const reportedVoyages = read<ReportedVoyage[]>("reportedvoyages.json");

const countryName = new Map(countries.map((c) => [c.id, c.name]));
const companyName = new Map(companies.map((c) => [c.id, c.name]));
const vesselName = new Map(vessels.map((v) => [v.imo, v.name]));
const portName = new Map(ports.map((p) => [p.id, p.name]));
const authorityName = new Map(authorities.map((a) => [a.id, a.name]));
const personName = new Map(persons.map((p) => [p.id, p.name]));

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csv(rows: Record<string, unknown>[], cols: string[]): string {
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => cell(r[c])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}
function write(name: string, content: string) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), content, "utf8");
  console.log(`wrote ${path.join(OUT, name)}`);
}

const appliesToName = (d: Designation) =>
  d.appliesToType === "vessel" ? vesselName.get(d.appliesToId) ?? d.appliesToId
                               : companyName.get(d.appliesToId) ?? d.appliesToId;

const vesselStatus = (imo: string): string => {
  const ds = designations.filter((d) => d.appliesToType === "vessel" && d.appliesToId === imo);
  if (ds.some((d) => d.currentStatus === "active")) return "active (verified)";
  if (ds.some((d) => d.currentStatus === "current-unverified")) return "listed; current status not verified";
  if (ds.length && ds.every((d) => d.currentStatus === "removed")) return "removed (delisted)";
  return "no designation";
};
write("vessel.csv", csv(
  vessels.map((v) => ({
    name: v.name, imo: v.imo, mmsi: v.mmsi, vesselType: v.vesselType,
    aliases: v.aliases.join("; "),
    flag: v.flagCountryId ? countryName.get(v.flagCountryId) : "",
    flagStatus: v.flagStatus, flagSourceUrl: v.flagSourceUrl ?? "", flagVerifiedAt: v.flagVerifiedAt ?? "",
    aliasSourceUrl: v.aliasSourceUrl ?? "", nameSourceUrl: v.nameSourceUrl ?? "",
    yearBuilt: v.yearBuilt, callSign: v.callSign, status: vesselStatus(v.imo), sourceUrl: v.sourceUrl,
  })),
  ["name", "imo", "mmsi", "vesselType", "aliases", "flag", "flagStatus", "flagSourceUrl", "flagVerifiedAt", "aliasSourceUrl", "nameSourceUrl", "yearBuilt", "callSign", "status", "sourceUrl"],
));

write("company.csv", csv(
  companies.map((c) => ({
    name: c.name, imoCompanyNumber: c.imoCompanyNumber,
    jurisdictionOfIncorporation: c.jurisdiction, jurisdictionSourceType: c.jurisdictionSourceType ?? "",
    describedAsBasedIn: c.describedAsBasedIn,
    listedAddressCountry: c.addressCountryId ? countryName.get(c.addressCountryId) : "",
    registeredAddress: c.registeredAddress, taxId: c.taxId, registrationNumber: c.registrationNumber,
    lei: c.lei, sourceUrl: c.sourceUrl,
  })),
  ["name", "imoCompanyNumber", "jurisdictionOfIncorporation", "jurisdictionSourceType", "describedAsBasedIn", "listedAddressCountry", "registeredAddress", "taxId", "registrationNumber", "lei", "sourceUrl"],
));

write("designation.csv", csv(
  designations.map((d) => ({
    name: `${appliesToName(d)} — ${d.listName} ${d.program ?? ""}`.trim(),
    appliesTo: appliesToName(d), appliesToType: d.appliesToType,
    listName: d.listName, nature: d.nature, program: d.program, designationDate: d.designationDate,
    currentStatus: d.currentStatus, statusVerifiedAt: d.statusVerifiedAt, statusSource: d.statusSource ?? "",
    dateRemoved: d.dateRemoved, issuedBy: authorityName.get(d.authorityId) ?? d.authorityId,
    uniqueId: d.uniqueId ?? "", sourceUrl: d.sourceUrl,
  })),
  ["name", "appliesTo", "appliesToType", "listName", "nature", "program", "designationDate", "currentStatus", "statusVerifiedAt", "statusSource", "dateRemoved", "issuedBy", "uniqueId", "sourceUrl"],
));

write("authority.csv", csv(
  authorities.map((a) => ({ name: a.name, jurisdiction: a.jurisdiction, type: a.type, sourceUrl: a.sourceUrl ?? "" })),
  ["name", "jurisdiction", "type", "sourceUrl"],
));

write("country.csv", csv(
  countries.map((c) => ({ name: c.name, isoAlpha3: c.isoAlpha3, lat: c.lat, lon: c.lon })),
  ["name", "isoAlpha3", "lat", "lon"],
));

write("region.csv", csv(
  regions.map((r) => ({ name: r.name, lat: r.lat, lon: r.lon })),
  ["name", "lat", "lon"],
));

write("port.csv", csv(
  ports.map((p) => ({
    name: p.name, unlocode: p.unlocode,
    country: p.countryId ? countryName.get(p.countryId) : "",
    lat: p.lat, lon: p.lon, coordinateStatus: p.coordinateStatus ?? "", coordinateSourceType: p.coordinateSourceType ?? "",
    codeSourceUrl: p.codeSourceUrl ?? "", coordinateSourceUrl: p.coordinateSourceUrl ?? "",
    sourceVersion: p.sourceVersion ?? "", verifiedAt: p.verifiedAt ?? "",
  })),
  ["name", "unlocode", "country", "lat", "lon", "coordinateStatus", "coordinateSourceType", "codeSourceUrl", "coordinateSourceUrl", "sourceVersion", "verifiedAt"],
));

write("ownership.csv", csv(
  ownership.map((o) => ({
    vessel: vesselName.get(o.vesselImo) ?? o.vesselImo,
    company: companyName.get(o.companyId) ?? o.companyId,
    relationType: o.role, confidence: o.confidence,
    listingSourceUrl: o.listingSourceUrl, predicateEvidenceUrl: o.predicateEvidenceUrl,
    evidenceQuote: o.evidenceQuote, evidenceDate: o.evidenceDate ?? "", roleCurrency: o.roleCurrency ?? "", note: o.note ?? "",
  })),
  ["vessel", "company", "relationType", "confidence", "listingSourceUrl", "predicateEvidenceUrl", "evidenceQuote", "evidenceDate", "roleCurrency", "note"],
));

write("companylink.csv", csv(
  companyLinks.map((p) => ({
    fromCompany: companyName.get(p.fromCompanyId) ?? p.fromCompanyId,
    toCompany: companyName.get(p.toCompanyId) ?? p.toCompanyId,
    relation: p.relation, confidence: p.confidence, note: p.note ?? "", sourceUrl: p.sourceUrl,
  })),
  ["fromCompany", "toCompany", "relation", "confidence", "note", "sourceUrl"],
));

write("reportedvoyage.csv", csv(
  reportedVoyages.map((rv) => ({
    vessel: vesselName.get(rv.vesselImo) ?? rv.vesselImo,
    origin: portName.get(rv.originPortId) ?? rv.originPortId,
    destination: portName.get(rv.destinationPortId) ?? rv.destinationPortId,
    reportedPeriod: rv.reportedPeriod, timeGranularity: rv.timeGranularity,
    observationType: rv.observationType, note: rv.note ?? "", sourceUrl: rv.sourceUrl,
  })),
  ["vessel", "origin", "destination", "reportedPeriod", "timeGranularity", "observationType", "note", "sourceUrl"],
));

write("beneficialowner.csv", csv(
  beneficialOwners.map((b) => ({
    owner: b.ownerType === "person" ? personName.get(b.ownerId) ?? b.ownerId : companyName.get(b.ownerId) ?? b.ownerId,
    ownerType: b.ownerType, company: companyName.get(b.companyId) ?? b.companyId,
    confidence: b.confidence, sourceUrl: b.sourceUrl,
  })),
  ["owner", "ownerType", "company", "confidence", "sourceUrl"],
));

console.log("done.");
