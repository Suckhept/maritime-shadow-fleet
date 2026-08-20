/**
 * build-seed.ts — single source of truth for the curated seed.
 *
 * Rules (post second-round review):
 *  - Relation predicates match the EXACT wording of a PROVING document. Each relation stores both the
 *    listing action (`listingSourceUrl`) and the doc that proves the predicate (`predicateEvidenceUrl`)
 *    plus an `evidenceQuote` and `evidenceDate`.
 *  - Sanction status is three-valued (active | removed | current-unverified). All OFAC records were
 *    re-verified `active` on the live SLS (2026-06-15); Yasa/Ice Pearl are `removed`; no record currently
 *    uses current-unverified. Per-record UIDs are in data/ofac-verification.json.
 *  - Movement is a `ReportedVoyage` (secondary analysis, month-level), never an AIS port-call event.
 *
 * Run:  npx tsx scripts/build-seed.ts
 */
import fs from "node:fs";
import path from "node:path";
import type {
  Vessel, Company, Designation, OwnershipLink, CompanyLink, ReportedVoyage,
  Country, Region, Port, Authority, OwnershipRole, DesignationNature, Confidence, DesignationStatus, FlagStatus,
} from "../src/lib/types";

const OUT = "data/seed";

const SRC = {
  ofac20231012: "https://ofac.treasury.gov/recent-actions/20231012",
  ofacPR1795: "https://home.treasury.gov/news/press-releases/jy1795",
  ofac20231102: "https://ofac.treasury.gov/recent-actions/20231102",
  ofac20231201: "https://ofac.treasury.gov/recent-actions/20231201",
  ofacPR1940: "https://home.treasury.gov/news/press-releases/jy1940",
  ofac20240118: "https://ofac.treasury.gov/recent-actions/20240118",
  ofacPR2028: "https://home.treasury.gov/news/press-releases/jy2028",
  ofac20240223: "https://ofac.treasury.gov/recent-actions/20240223_33",
  ofacPR2121: "https://home.treasury.gov/news/press-releases/jy2121",
  ofac20240905: "https://ofac.treasury.gov/recent-actions/20240905",
  ofac20240426: "https://ofac.treasury.gov/recent-actions/20240426",
  uneceRu: "https://service.unece.org/trade/locode/ru.htm",
  uneceCn: "https://service.unece.org/trade/locode/cn.htm",
  wikiPrimorskPort: "https://en.wikipedia.org/wiki/Port_of_Primorsk",
  wikiZhoushan: "https://en.wikipedia.org/wiki/Zhoushan",
  uk20260210: "https://assets.publishing.service.gov.uk/media/698b59868492b54795c1be6d/Sanctions_Notice__Russia__10_February_2026.pdf",
  brookings: "https://www.brookings.edu/articles/strains-on-the-sovcomflot-oil-tanker-fleet/",
  ofac20251231: "https://ofac.treasury.gov/recent-actions/20251231",
  sb0348: "https://home.treasury.gov/news/press-releases/sb0348",   // press release with the "registered owner" + "property interest" wording
  slsTool: "https://sanctionssearch.ofac.treas.gov/",
};

const countries: Country[] = [
  { id: "LBR", name: "Liberia", isoAlpha3: "LBR", lat: 6.43, lon: -9.43 },
  { id: "MHL", name: "Marshall Islands", isoAlpha3: "MHL", lat: 7.13, lon: 171.18 },
  { id: "PAN", name: "Panama", isoAlpha3: "PAN", lat: 8.54, lon: -80.78 },
  { id: "GAB", name: "Gabon", isoAlpha3: "GAB", lat: -0.80, lon: 11.61 },
  { id: "GIN", name: "Guinea", isoAlpha3: "GIN", lat: 9.51, lon: -13.71 },
  { id: "PLW", name: "Palau", isoAlpha3: "PLW", lat: 7.51, lon: 134.58 },
  { id: "TUR", name: "Turkey", isoAlpha3: "TUR", lat: 38.96, lon: 35.24 },
  { id: "IND", name: "India", isoAlpha3: "IND", lat: 20.59, lon: 78.96 },
  { id: "ARE", name: "United Arab Emirates", isoAlpha3: "ARE", lat: 23.42, lon: 53.85 },
  { id: "CHN", name: "China", isoAlpha3: "CHN", lat: 35.86, lon: 104.20 },
  { id: "RUS", name: "Russia", isoAlpha3: "RUS", lat: 61.52, lon: 105.32 },
  { id: "USA", name: "United States", isoAlpha3: "USA", lat: 39.50, lon: -98.35 },
  { id: "GBR", name: "United Kingdom", isoAlpha3: "GBR", lat: 55.38, lon: -3.44 },
];

const regions: Region[] = [
  { id: "baltic-sea", name: "Baltic Sea", lat: 58.5, lon: 20.0 },
  { id: "black-sea", name: "Black Sea", lat: 43.0, lon: 34.0 },
  { id: "pacific-ocean", name: "Pacific Ocean", lat: 0.0, lon: 160.0 },
];

const authorities: Authority[] = [
  { id: "ofac", name: "Office of Foreign Assets Control", jurisdiction: "United States", type: "government", sourceUrl: "https://ofac.treasury.gov/sanctions-list-service" },
  { id: "uk-fcdo", name: "Foreign, Commonwealth and Development Office", jurisdiction: "United Kingdom", type: "government", sourceUrl: "https://www.gov.uk/government/publications/the-uk-sanctions-list" },
  { id: "kse-institute", name: "Kyiv School of Economics Institute", jurisdiction: null, type: "research-ngo", sourceUrl: "https://kse.ua/" },
];

// Only the two ports used by the reported voyage. UN/LOCODE + coordinates are sourced from the UNECE
// LOCODE service (degree-minute resolution). Brookings is NOT a source for codes/coordinates — it is the
// source for the *voyage* only (see reportedVoyages). Reference-only context ports were removed.
// Codes are proved by UNECE LOCODE (codeSourceUrl). The UNECE rows for RU PRI / CN ZOS carry no
// coordinates, so lat/lon are sourced separately (coordinateSourceUrl) and flagged "approximate".
const ports: Port[] = [
  { id: "RUPRI", name: "Primorsk", unlocode: "RUPRI", countryId: "RUS", lat: 60.333, lon: 28.717,
    codeSourceUrl: SRC.uneceRu, coordinateSourceUrl: SRC.wikiPrimorskPort, coordinateStatus: "approximate", coordinateSourceType: "secondary", sourceVersion: "UNECE LOCODE 2024-2", verifiedAt: "2026-06-15" },
  { id: "CNZOS", name: "Zhoushan", unlocode: "CNZOS", countryId: "CHN", lat: 29.986, lon: 122.207,
    codeSourceUrl: SRC.uneceCn, coordinateSourceUrl: SRC.wikiZhoushan, coordinateStatus: "approximate", coordinateSourceType: "secondary", sourceVersion: "UNECE LOCODE 2024-2", verifiedAt: "2026-06-15" },
];

interface SelfDesig { dateListed: string | null; status: DesignationStatus; verifiedAt: string | null; statusSource: string | null; dateRemoved?: string | null; authorityId: string; listName: string; program: string | null; sourceUrl: string; uniqueId?: string | null; }
interface CompanyDef extends Omit<Company, "id" | "jurisdictionSourceType"> { id: string; self?: SelfDesig; jurisdictionSourceType?: string }

const UNVERIFIED: DesignationStatus = "current-unverified";
const ACTIVE: DesignationStatus = "active";
// Every OFAC SDN record below was re-verified against the LIVE OFAC Sanctions List Search on 2026-06-15
// (SDN List version 2026-06-11): vessels by exact-IMO lookup, companies by name. Yasa Golden Bosphorus and
// Ice Pearl Navigation Corp returned 0 results -> remain removed. Per-record OFAC detail-page IDs are in
// data/SOURCES.md. This is the live-status check the dataset previously deferred.
const LIVE_AT = "2026-06-15";
// OFAC SDN UID per record. The numeric id is OFAC's per-listing UID (the key used by the Sanctions List
// Search; Details.aspx?id=<UID>). Used as both `uniqueId` and a stable per-record `statusSource` — no
// record falls back to the generic search homepage. Vessel UIDs cross-checked against OFAC detail pages
// (New Energy 50628 independently re-fetched: NEW ENERGY, IMO 9324277, RUSSIA-EO14024, Linked To Gotik).
const slsDetail = (uid: string) => `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${uid}`;
const OFAC_UID_COMPANY: Record<string, string> = {
  "joint-stock-company-sovcomflot": "34741", "hennesea-holdings-limited": "47212",
  "streymoy-shipping-limited": "46609", "gotik-shipping-co": "50626",
  "plio-energy-cargo-shipping-opc-private-limited": "50627",
  "limited-liability-company-arctic-lng-2": "46030", "lumber-marine-sa": "45554",
  "winky-international-limited": "56723",
};
const OFAC_UID_VESSEL: Record<string, string> = {
  "9610808": "46957", "9610793": "46991", "9270529": "47037", "9256078": "47034", "9256054": "47022",
  "9413559": "46972", "9412359": "47053", "9411020": "47006", "9341067": "47007", "9312884": "47009",
  "9341093": "47003", "9312896": "47046", "9339313": "46976", "9249128": "47015",
  "9381732": "47216", "9410894": "47217", "9410870": "47218", "9249087": "47219", "9381744": "47233",
  "9864837": "50629", "9324277": "50628", "9610810": "46611", "9421960": "45555",
};

const companies: CompanyDef[] = [
  { id: "joint-stock-company-sovcomflot", name: "Joint Stock Company Sovcomflot", imoCompanyNumber: null, jurisdiction: "Russia", describedAsBasedIn: null, addressCountryId: "RUS", registeredAddress: "Ul. Gasheka D. 6, Moscow 125047, Russia", taxId: "7702060116", registrationNumber: "1027739028712", lei: "253400DYLWR5A6YAWJ69", sourceUrl: SRC.ofac20240223,
    self: { dateListed: "2024-02-23", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20240223 } },
  { id: "hennesea-holdings-limited", name: "Hennesea Holdings Limited", imoCompanyNumber: null, jurisdiction: null, describedAsBasedIn: "United Arab Emirates", addressCountryId: "ARE", registeredAddress: "1229, Al Sila Tower, ADGM Square, Al Maryah Island, Abu Dhabi, United Arab Emirates", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofac20240118,
    self: { dateListed: "2024-01-18", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20240118 } },
  { id: "streymoy-shipping-limited", name: "Streymoy Shipping Limited", imoCompanyNumber: null, jurisdiction: null, describedAsBasedIn: "United Arab Emirates", addressCountryId: "ARE", registeredAddress: null, taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofacPR1940,
    self: { dateListed: "2023-12-01", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofacPR1940 } },
  { id: "gotik-shipping-co", name: "Gotik Shipping Co", imoCompanyNumber: "6505487", jurisdiction: null, describedAsBasedIn: null, addressCountryId: "IND", registeredAddress: "Sankul CHS, Agra Road, Kalyan, Thane, Maharashtra 421301, India; Liberia", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofac20240905,
    self: { dateListed: "2024-09-05", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20240905 } },
  { id: "plio-energy-cargo-shipping-opc-private-limited", name: "Plio Energy Cargo Shipping OPC Private Limited", imoCompanyNumber: "0028953", jurisdiction: null, describedAsBasedIn: "India", addressCountryId: "IND", registeredAddress: "Sankul CHS, Agra Road, Kalyan, Thane, Maharashtra 421301, India", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofac20240905,
    self: { dateListed: "2024-09-05", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20240905 } },
  { id: "limited-liability-company-arctic-lng-2", name: "Limited Liability Company Arctic LNG 2", imoCompanyNumber: null, jurisdiction: "Russia", describedAsBasedIn: null, addressCountryId: "RUS", registeredAddress: "d. 9 kab. 117, mikroraion Slavyanski, Novy Urengoi 629309, Russia", taxId: "8904075357", registrationNumber: "1148904001278", lei: null, sourceUrl: SRC.ofac20231102,
    self: { dateListed: "2023-11-02", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20231102 } },
  { id: "lumber-marine-sa", name: "Lumber Marine SA", imoCompanyNumber: "5463420", jurisdiction: null, describedAsBasedIn: "United Arab Emirates", addressCountryId: "ARE", registeredAddress: "Office OT 17-32, 17th Floor, Central Park Towers, Dubai, United Arab Emirates; 80 Broad Street, Monrovia, Liberia", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofac20231012,
    self: { dateListed: "2023-10-12", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20231012 } },
  { id: "ice-pearl-navigation-corp", name: "Ice Pearl Navigation Corp", imoCompanyNumber: "4118745", jurisdiction: null, describedAsBasedIn: "Turkey", addressCountryId: "TUR", registeredAddress: "Ucpinarlar Caddesi 36, Kucuk Camlica, Uskudar 34696, Turkey; Marshall Islands", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.ofac20231012,
    self: { dateListed: "2023-10-12", status: "removed", verifiedAt: "2024-04-26", statusSource: SRC.ofac20240426, dateRemoved: "2024-04-26", authorityId: "ofac", listName: "OFAC SDN", program: "RUSSIA-EO14024", sourceUrl: SRC.ofac20231012 } },
  { id: "west-maritime-services-and-trading-inc", name: "West Maritime Services and Trading Inc", imoCompanyNumber: null, jurisdiction: "not stated in source", describedAsBasedIn: "not stated in source", addressCountryId: null, registeredAddress: "not stated in source", taxId: null, registrationNumber: null, lei: null, sourceUrl: SRC.uk20260210, jurisdictionSourceType: "Not stated in the UK ship specification (10 Feb 2026). Registry aggregator (Ukraine GUR, Equasis-derived) reports Saint Kitts and Nevis, reg. 0035133; not promoted pending primary-source (Equasis/GISIS) confirmation." },
  { id: "winky-international-limited", name: "Winky International Limited", imoCompanyNumber: null, jurisdiction: "Marshall Islands", describedAsBasedIn: null, addressCountryId: "MHL", registeredAddress: "14th Floor, Guangdong Investment Tower, 148 Connaught Road Central, Hong Kong, China; Majuro, Ajeltake Island 96960, Marshall Islands", taxId: null, registrationNumber: "128617", lei: null, sourceUrl: SRC.ofac20251231,
    self: { dateListed: "2025-12-31", status: UNVERIFIED, verifiedAt: null, statusSource: null, authorityId: "ofac", listName: "OFAC SDN", program: "VENEZUELA-EO13850", sourceUrl: SRC.ofac20251231 } },
];

interface VesselDef {
  name: string; imo: string; mmsi: string | null; vesselType: string | null;
  flag: string | null; flagStatus: FlagStatus; yearBuilt?: number | null; callSign?: string | null;
  owner: string; role: OwnershipRole; relConfidence: Confidence;
  listingUrl: string; evidenceUrl: string; evidenceQuote: string; evidenceDate: string | null; relNote: string;
  flagSourceUrl?: string; flagVerifiedAt?: string | null; aliases?: string[]; aliasSourceUrl?: string | null; nameSourceUrl?: string; roleCurrency?: "verified" | "unverified";
  desig: { listName: string; nature: DesignationNature; program: string | null; dateListed: string | null; status: DesignationStatus; verifiedAt: string | null; statusSource: string | null; dateRemoved?: string | null; authorityId: string; sourceUrl: string; uniqueId?: string | null; statementOfReasons?: string | null };
}

const ofacDesig = (program: string, date: string | null, source: string) => ({
  listName: "OFAC SDN", nature: "binding-sanction" as const, program, dateListed: date,
  status: ACTIVE, verifiedAt: LIVE_AT, statusSource: null, dateRemoved: null, authorityId: "ofac", sourceUrl: source,
});

const SCF = "joint-stock-company-sovcomflot";
const SCF_QUOTE = "OFAC press release jy2121: 14 crude oil tankers identified as property in which Joint Stock Company Sovcomflot has an interest (all beneficially owned by Sovcomflot).";
const sovcomflot: VesselDef[] = ([
  ["Anatoly Kolodkin", "9610808", "352003372", "PAN"],
  ["Georgy Maslov", "9610793", "626362000", "GAB"],
  ["Krymsk", "9270529", "626364000", "GAB"],
  ["Liteyny Prospect", "9256078", "626367000", "GAB"],
  ["Nevskiy Prospect", "9256054", "626369000", "GAB"],
  ["NS Antarctic", "9413559", "626372000", "GAB"],
  ["NS Bravo", "9412359", "626377000", "GAB"],
  ["NS Burgas", "9411020", "626378000", "GAB"],
  ["NS Captain", "9341067", "626379000", "GAB"],
  ["NS Columbus", "9312884", "626382000", "GAB"],
  ["NS Consul", "9341093", "626388000", "GAB"],
  ["NS Creation", "9312896", "626390000", "GAB"],
  ["NS Lion", "9339313", "626393000", "GAB"],
  ["Sakhalin Island", "9249128", "352002202", "PAN"],
] as const).map(([name, imo, mmsi, flag]) => ({
  name, imo, mmsi, vesselType: "Crude oil tanker", flag, flagStatus: "listed" as FlagStatus,
  owner: SCF, role: "interestHolder" as OwnershipRole, relConfidence: "confirmed" as Confidence,
  listingUrl: SRC.ofac20240223, evidenceUrl: SRC.ofacPR2121, evidenceQuote: SCF_QUOTE, evidenceDate: "2024-02-23",
  relNote: "Registered owner not asserted (would require a registry source such as Equasis / IMO GISIS).",
  desig: ofacDesig("RUSSIA-EO14024", "2024-02-23", SRC.ofac20240223),
}));

const HEN = "hennesea-holdings-limited";
const HEN_QUOTE = "OFAC press release jy2028: vessels, all of which are beneficially owned by Hennesea, as property in which Hennesea has an interest.";
const hennesea: VesselDef[] = ([
  ["HS Buraq", "9381732", "636022364", "Products tanker"],
  ["HS Esberg", "9410894", "636022386", "Products tanker"],
  ["HS Everett", "9410870", "636022403", "Crude oil tanker"],
  ["HS Glory", "9249087", "636018127", "Crude oil tanker"],
  ["HS Legend", "9381744", "636022362", "Crude oil tanker"],
] as const).map(([name, imo, mmsi, type]) => ({
  name, imo, mmsi, vesselType: type, flag: "LBR", flagStatus: "listed" as FlagStatus,
  owner: HEN, role: "beneficialOwner" as OwnershipRole, relConfidence: "confirmed" as Confidence,
  listingUrl: SRC.ofac20240118, evidenceUrl: SRC.ofacPR2028, evidenceQuote: HEN_QUOTE, evidenceDate: "2024-01-18",
  relNote: "Beneficial/ultimate ownership per OFAC press release; SDN listing tags the vessel Linked To Hennesea.",
  desig: ofacDesig("RUSSIA-EO14024", "2024-01-18", SRC.ofac20240118),
}));

const others: VesselDef[] = [
  // Arctic LNG 2 carriers (OFAC 2024-09-05): the SDN entry tags the vessel "Linked To" the linked company.
  { name: "Mulan", imo: "9864837", mmsi: null, vesselType: "LNG carrier", flag: "PLW", flagStatus: "listed", yearBuilt: 2024, aliases: ["Arctic Mulan"], aliasSourceUrl: "https://war-sanctions.gur.gov.ua/en/transport/ships/309",  owner: "plio-energy-cargo-shipping-opc-private-limited", role: "linkedTo", relConfidence: "confirmed", listingUrl: SRC.ofac20240905, evidenceUrl: SRC.ofac20240905, evidenceQuote: "OFAC SDN entry: MULAN ... (Linked To: PLIO ENERGY CARGO SHIPPING OPC PRIVATE LIMITED).", evidenceDate: "2024-09-05", relNote: "Bare OFAC 'Linked To'; no stronger ownership claim in the source.", desig: ofacDesig("RUSSIA-EO14024", "2024-09-05", SRC.ofac20240905) },
  { name: "New Energy", imo: "9324277", mmsi: null, vesselType: "LNG carrier", flag: "PLW", flagStatus: "listed", owner: "gotik-shipping-co", role: "linkedTo", relConfidence: "confirmed", listingUrl: SRC.ofac20240905, evidenceUrl: SRC.ofac20240905, evidenceQuote: "OFAC SDN entry: NEW ENERGY ... (Linked To: GOTIK SHIPPING CO).", evidenceDate: "2024-09-05", relNote: "Bare OFAC 'Linked To'; no stronger ownership claim in the source.", desig: ofacDesig("RUSSIA-EO14024", "2024-09-05", SRC.ofac20240905) },
  // Viktor Bakaev (OFAC 2023-12-01): press release names Streymoy as the registered owner.
  { name: "Viktor Bakaev", imo: "9610810", mmsi: "636015565", vesselType: "Crude oil tanker", flag: "LBR", flagStatus: "listed", owner: "streymoy-shipping-limited", role: "registeredOwner", relConfidence: "confirmed", listingUrl: SRC.ofac20231201, evidenceUrl: SRC.ofacPR1940, evidenceQuote: "OFAC press release jy1940: UAE-based Streymoy Shipping Limited is the registered owner of the Viktor Bakaev.", evidenceDate: "2023-12-01", relNote: "S&P reports ultimate control by Sovcomflot — secondary, not asserted as an edge.", desig: ofacDesig("RUSSIA-EO14024", "2023-12-01", SRC.ofacPR1940) },
  // SCF Primorye / Yasa (OFAC 2023-10-12): press release explicitly says "registered owner".
  { name: "SCF Primorye", imo: "9421960", mmsi: "636014308", vesselType: "Crude oil tanker", flag: "LBR", flagStatus: "listed", callSign: "A8SW6", owner: "lumber-marine-sa", role: "registeredOwner", relConfidence: "confirmed", listingUrl: SRC.ofac20231012, evidenceUrl: SRC.ofacPR1795, evidenceQuote: "OFAC press release jy1795: UAE-based Lumber Marine SA is the registered owner of the SCF Primorye.", evidenceDate: "2023-10-12", relNote: "", desig: ofacDesig("RUSSIA-EO14024", "2023-10-12", SRC.ofac20231012) },
  { name: "Yasa Golden Bosphorus", imo: "9334038", mmsi: "538002662", vesselType: "Crude oil tanker", flag: "MHL", flagStatus: "delisted", callSign: "V7KQ8", owner: "ice-pearl-navigation-corp", role: "registeredOwner", relConfidence: "confirmed", listingUrl: SRC.ofac20231012, evidenceUrl: SRC.ofacPR1795, evidenceQuote: "OFAC press release jy1795: Turkiye-based Ice Pearl Navigation Corp is the registered owner of the Yasa Golden Bosphorus.", evidenceDate: "2023-10-12", relNote: "Both vessel and owner were delisted by OFAC on 2024-04-26 — historical sanctions case.", desig: { listName: "OFAC SDN", nature: "binding-sanction", program: "RUSSIA-EO14024", dateListed: "2023-10-12", status: "removed", verifiedAt: "2024-04-26", statusSource: SRC.ofac20240426, dateRemoved: "2024-04-26", authorityId: "ofac", sourceUrl: SRC.ofac20231012 } },
  // Lunar Tide / Rosalind (IMO 9277735): DUAL-LISTED. OFAC (2025-12-31) lists "ROSALIND a.k.a. Lunar Tide",
  // Guinea flag, Venezuela programme, linked to Winky International. UK (2026-02-10) lists "Lunar Tide" under the
  // Russia regime (owner-operator West Maritime) and struck an erroneous flag value. Flag = Guinea per OFAC.
  { name: "Lunar Tide", imo: "9277735", mmsi: null, vesselType: "Oil Products Tanker", flag: "GIN", flagStatus: "listed", yearBuilt: 2004,
    flagSourceUrl: SRC.ofac20251231, flagVerifiedAt: "2026-06-15", aliases: ["Rosalind"], aliasSourceUrl: SRC.ofac20251231, nameSourceUrl: SRC.uk20260210,
    owner: "west-maritime-services-and-trading-inc", role: "ownerOperator", relConfidence: "confirmed", roleCurrency: "unverified", listingUrl: SRC.uk20260210, evidenceUrl: SRC.uk20260210, evidenceQuote: "UK Sanctions List notice (10 Feb 2026): Current owner operators: WEST MARITIME SERVICES AND TRADING INC.", evidenceDate: "2026-02-10", relNote: "UK 'owner operators' field (reported as of 2026-02-10); not split into owner vs operator without a further source. NB: OFAC (2025-12-31, sb0348) names Winky International Limited as registered owner of the same hull — source discrepancy / possible role change, unreconciled.",
    desig: { listName: "UK Sanctions List", nature: "binding-sanction", program: "The Russia (Sanctions) (EU Exit) Regulations 2019", dateListed: "2025-07-21", status: "active", verifiedAt: "2026-06-18", statusSource: "https://www.gov.uk/government/publications/the-uk-sanctions-list", authorityId: "uk-fcdo", uniqueId: "RUS2841", statementOfReasons: "IMO 9277735 is, has been or is likely to be involved in carrying oil or oil products that originated in Russia from Russia to a third country.", sourceUrl: SRC.uk20260210 } },
];

const vesselDefs: VesselDef[] = [...sovcomflot, ...hennesea, ...others];

// company -> company (OFAC "Linked To" from the 2024-09-05 action; NOT corporate parent).
const companyLinks: CompanyLink[] = [
  { fromCompanyId: "limited-liability-company-arctic-lng-2", toCompanyId: "gotik-shipping-co", relation: "linkedTo", confidence: "reported", note: "OFAC SDN entry (2024-09-05): Gotik Shipping Co Linked To Limited Liability Company Arctic LNG 2. OFAC does not state equity ownership.", sourceUrl: SRC.ofac20240905 },
  { fromCompanyId: "limited-liability-company-arctic-lng-2", toCompanyId: "plio-energy-cargo-shipping-opc-private-limited", relation: "linkedTo", confidence: "reported", note: "OFAC SDN entry (2024-09-05): Plio Energy Cargo Shipping OPC Private Limited Linked To Limited Liability Company Arctic LNG 2. OFAC does not state equity ownership.", sourceUrl: SRC.ofac20240905 },
];

const reportedVoyages: ReportedVoyage[] = [
  { id: "rv-9610810-primorsk-zhoushan", vesselImo: "9610810", originPortId: "RUPRI", destinationPortId: "CNZOS", reportedPeriod: "2024-07", timeGranularity: "month", observationType: "secondary-analysis", note: "Reported by Brookings (citing Bloomberg vessel-tracking analysis) at month-level resolution. Not AIS-confirmed; not a sanctions listing.", sourceUrl: SRC.brookings },
];

// ---- expand ----
const vessels: Vessel[] = vesselDefs.map((v) => ({
  id: v.imo, name: v.name, imo: v.imo, mmsi: v.mmsi, vesselType: v.vesselType,
  flagCountryId: v.flag, flagStatus: v.flagStatus, grossTonnage: null, deadweight: null,
  yearBuilt: v.yearBuilt ?? null, callSign: v.callSign ?? null,
  aliases: v.aliases ?? [],
  flagSourceUrl: v.flagSourceUrl ?? (v.flag ? v.listingUrl : null),   // flag stated in the listing action (Lunar Tide: OFAC)
  flagVerifiedAt: v.flagVerifiedAt ?? null,
  aliasSourceUrl: v.aliasSourceUrl ?? null,
  nameSourceUrl: v.nameSourceUrl ?? v.listingUrl,
  sourceUrl: v.evidenceUrl,
}));

const ownership: OwnershipLink[] = vesselDefs.map((v) => ({
  vesselImo: v.imo, companyId: v.owner, role: v.role, confidence: v.relConfidence,
  listingSourceUrl: v.listingUrl, predicateEvidenceUrl: v.evidenceUrl, evidenceQuote: v.evidenceQuote,
  evidenceDate: v.evidenceDate, roleCurrency: v.roleCurrency, note: v.relNote || null,
}));

const designations: Designation[] = [];
for (const v of vesselDefs) {
  designations.push({
    id: `d-${v.desig.authorityId}-${v.imo}`, appliesToType: "vessel", appliesToId: v.imo,
    listName: v.desig.listName, nature: v.desig.nature, program: v.desig.program,
    designationDate: v.desig.dateListed, currentStatus: v.desig.status, statusVerifiedAt: v.desig.verifiedAt,
    statusSource: (v.desig.status === ACTIVE && OFAC_UID_VESSEL[v.imo]) ? slsDetail(OFAC_UID_VESSEL[v.imo]) : v.desig.statusSource,
    dateRemoved: v.desig.dateRemoved ?? null, authorityId: v.desig.authorityId,
    uniqueId: (v.desig.status === ACTIVE && OFAC_UID_VESSEL[v.imo]) ? OFAC_UID_VESSEL[v.imo] : (v.desig.uniqueId ?? null),
    statementOfReasons: v.desig.statementOfReasons ?? null, sourceUrl: v.desig.sourceUrl,
  });
}
for (const c of companies) {
  if (!c.self) continue;
  const uid = (c.self.status === UNVERIFIED && OFAC_UID_COMPANY[c.id]) ? OFAC_UID_COMPANY[c.id] : undefined; // present on live SDN
  designations.push({
    id: `d-${c.self.authorityId}-${c.id}`, appliesToType: "company", appliesToId: c.id,
    listName: c.self.listName, nature: "binding-sanction", program: c.self.program,
    designationDate: c.self.dateListed,
    currentStatus: uid ? ACTIVE : c.self.status,
    statusVerifiedAt: uid ? LIVE_AT : c.self.verifiedAt,
    statusSource: uid ? slsDetail(uid) : c.self.statusSource,
    dateRemoved: c.self.dateRemoved ?? null, authorityId: c.self.authorityId,
    uniqueId: uid ? uid : (c.self.uniqueId ?? null), statementOfReasons: null, sourceUrl: c.self.sourceUrl,
  });
}

// Lunar Tide / Rosalind — SECOND, distinct designation on the same hull (OFAC Venezuela), plus its OFAC
// linked entity. The UK Russia listing and this OFAC Venezuela listing coexist on IMO 9277735.
designations.push({
  id: "d-ofac-9277735", appliesToType: "vessel", appliesToId: "9277735", listName: "OFAC SDN",
  nature: "binding-sanction", program: "VENEZUELA-EO13850", designationDate: "2025-12-31",
  currentStatus: ACTIVE, statusVerifiedAt: LIVE_AT, statusSource: "https://sanctionssearch.ofac.treas.gov/Details.aspx?id=56724",
  dateRemoved: null, authorityId: "ofac", uniqueId: "56724",
  statementOfReasons: "OFAC SDN lists this hull as ROSALIND (a.k.a. Lunar Tide), Guinea flag, linked to Winky International Limited; the Treasury press release (sb0348) names Winky as registered owner and identifies ROSALIND as blocked property in which Winky has an interest.",
  sourceUrl: SRC.ofac20251231,
});
// OFAC names Winky in TWO distinct ways in the press release (sb0348): registered owner AND interest holder.
// Both are kept as separate dated assertions. The "property interest" wording is in sb0348 (the SDN Recent-
// Actions line itself only says "Linked To: WINKY INTERNATIONAL LIMITED"), so predicate evidence points to sb0348.
ownership.push({
  vesselImo: "9277735", companyId: "winky-international-limited", role: "registeredOwner", confidence: "confirmed",
  listingSourceUrl: SRC.ofac20251231, predicateEvidenceUrl: SRC.sb0348,
  evidenceQuote: "Treasury press release sb0348 (2025-12-31): ROSALIND a.k.a. LUNAR TIDE, whose registered owner is Winky International Limited.",
  evidenceDate: "2025-12-31", roleCurrency: "unverified",
  note: "Reported as registered owner as of 2025-12-31 (OFAC). A UK notice dated 2026-02-10 lists West Maritime as current owner-operators of the same hull — source discrepancy / possible role change; not reconciled without Equasis/GISIS.",
});
ownership.push({
  vesselImo: "9277735", companyId: "winky-international-limited", role: "interestHolder", confidence: "confirmed",
  listingSourceUrl: SRC.ofac20251231, predicateEvidenceUrl: SRC.sb0348,
  evidenceQuote: "Treasury press release sb0348 (2025-12-31): identifying ROSALIND as blocked property in which Winky International Limited has an interest.",
  evidenceDate: "2025-12-31", roleCurrency: "unverified",
  note: "EO 13850 blocked-property framing. Coexists with the UK Russia listing (owner-operator West Maritime, 2026-02-10).",
});

const companiesOut: Company[] = companies.map(({ self, ...c }) => ({
  ...c, jurisdictionSourceType: (c as any).jurisdictionSourceType ?? (c.jurisdiction && c.jurisdiction !== "not stated in source" ? ("official-registration-id" as const) : null),
}));

const write = (name: string, data: unknown) => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + "\n", "utf8");
};
write("vessels.json", vessels);
write("companies.json", companiesOut);
write("designations.json", designations);
write("ownership.json", ownership);
write("companylinks.json", companyLinks);
write("reportedvoyages.json", reportedVoyages);
write("ports.json", ports);
write("countries.json", countries);
write("regions.json", regions);
write("authorities.json", authorities);
write("persons.json", []);
write("beneficialOwners.json", []);

// OFAC verification manifest: per-record UID -> detail URL -> verified date (verification artifact, audit ask).
const ofacManifest = {
  generatedFrom: "data/seed/designations.json",
  sanctionsListSearch: "https://sanctionssearch.ofac.treas.gov/",
  sdnListVersion: "2026-06-11",
  verifiedAt: LIVE_AT,
  note: "Each numeric id is the OFAC SDN UID, used by the Sanctions List Search as Details.aspx?id=<UID>. Statuses re-checked on the live SLS on the verifiedAt date; 0-result lookups are recorded as removed.",
  records: designations
    .filter((d) => d.authorityId === "ofac")
    .map((d) => ({
      appliesToType: d.appliesToType, appliesToId: d.appliesToId, program: d.program,
      currentStatus: d.currentStatus, uniqueId: d.uniqueId ?? null,
      statusSource: d.statusSource ?? null, statusVerifiedAt: d.statusVerifiedAt ?? null,
      dateRemoved: d.dateRemoved ?? null,
    })),
};
fs.writeFileSync("data/ofac-verification.json", JSON.stringify(ofacManifest, null, 2) + "\n", "utf8");

const byRole: Record<string, number> = {};
for (const o of ownership) byRole[o.role] = (byRole[o.role] ?? 0) + 1;
const byStatus: Record<string, number> = {};
for (const d of designations) byStatus[d.currentStatus] = (byStatus[d.currentStatus] ?? 0) + 1;
console.log(`vessels=${vessels.length} companies=${companiesOut.length} designations=${designations.length} ownership=${ownership.length} companyLinks=${companyLinks.length} reportedVoyages=${reportedVoyages.length}`);
console.log("predicates:", JSON.stringify(byRole), "status:", JSON.stringify(byStatus));
