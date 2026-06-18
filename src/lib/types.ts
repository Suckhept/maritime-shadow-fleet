export type DesignationNature = "binding-sanction" | "research-designation";

// Predicate for a vessel↔company relation, matched to the EXACT wording of the proving document:
// registeredOwner only where an authority/registry states it; interestHolder for OFAC "property in
// which X has an interest"; beneficialOwner for stated beneficial/ultimate ownership; ownerOperator for
// the UK "owner operators" field; linkedTo for a bare "Linked To" with no stronger claim.
export type OwnershipRole =
  | "registeredOwner"
  | "beneficialOwner"
  | "interestHolder"
  | "ownerOperator"
  | "operator"
  | "shipManager"
  | "ismManager"
  | "linkedTo";

export type ObservationType =
  | "AIS"
  | "ais-derived"
  | "secondary-analysis"
  | "reported-in-listing"
  | "research-report";

export type TimeGranularity = "exact" | "day" | "month" | "year" | "unknown";

// active        — confirmed currently in force by a dated source check
// removed        — delisted
// current-unverified — listed in the cited action, but present/live status NOT re-checked
export type DesignationStatus = "active" | "removed" | "current-unverified";

export type Confidence = "confirmed" | "probable" | "reported" | "unconfirmed";

// listed              — flag present and current in the source
// removed-from-source — the source struck the flag without replacement (do not infer a country)
// unknown             — never stated
export type FlagStatus = "listed" | "removed-from-source" | "unknown";

export interface Country {
  id: string;
  name: string;
  isoAlpha3: string;
  lat: number;
  lon: number;
}

export interface Region {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Port {
  id: string;
  name: string;
  unlocode: string | null;
  countryId: string | null;
  lat: number | null;
  lon: number | null;
  referenceOnly?: boolean;
  codeSourceUrl?: string;                                   // proves the UN/LOCODE (UNECE LOCODE service)
  coordinateSourceUrl?: string;                             // proves the lat/lon (distinct from the code)
  coordinateStatus?: "verified" | "approximate" | "unverified";
  coordinateSourceType?: "primary" | "secondary";
  sourceVersion?: string | null;
  verifiedAt?: string | null;
}

export interface Authority {
  id: string;
  name: string;
  jurisdiction: string | null;
  type: "government" | "research-ngo";
  sourceUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  imoCompanyNumber: string | null;
  jurisdiction: string | null;        // jurisdiction of incorporation — only from official registration identifiers
  jurisdictionSourceType?: "official-registration-id" | null; // how jurisdiction was established (null if not set)
  describedAsBasedIn: string | null;  // country a sanctions source merely "describes as based in"
  addressCountryId: string | null;    // listed-address country (not a place of control)
  registeredAddress: string | null;
  taxId: string | null;
  registrationNumber: string | null;
  lei: string | null;
  sourceUrl: string;
}

export interface Person {
  id: string;
  name: string;
  nationality: string | null;
  sourceUrl: string;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string | null;
  vesselType: string | null;
  flagCountryId: string | null;
  flagStatus: FlagStatus;
  grossTonnage: number | null;
  deadweight: number | null;
  yearBuilt: number | null;
  callSign: string | null;
  aliases: string[];
  flagSourceUrl?: string | null;       // source that states the flag (NOT the generic vessel sourceUrl)
  flagVerifiedAt?: string | null;      // when the flag was last verified against that source
  aliasSourceUrl?: string | null;      // source for the alias name(s)
  nameSourceUrl?: string | null;       // source for the display name
  sourceUrl: string;                   // primary listing source (designation evidence)
}

// A vessel↔company relation. The predicate is proved by `predicateEvidenceUrl` (+ quote/date), which may
// differ from the `listingSourceUrl` (the SDN action that merely lists the two entities together).
export interface OwnershipLink {
  vesselImo: string;
  companyId: string;
  role: OwnershipRole;
  confidence: Confidence;
  listingSourceUrl: string;
  predicateEvidenceUrl: string;
  evidenceQuote: string;
  evidenceDate: string | null;
  roleCurrency?: "verified" | "unverified"; // is the role current per a registry? unverified when only a dated listing supports it
  note?: string | null;
}

export interface BeneficialOwnerLink {
  ownerId: string;
  ownerType: "person" | "company";
  companyId: string;
  confidence: Confidence;
  sourceUrl: string;
}

// company ↔ company relation. `relation` matched to source wording; `parentOf` reserved for a corporate
// registry / shareholder / equity statement. A bare OFAC "Linked To" is `linkedTo`.
export interface CompanyLink {
  fromCompanyId: string;
  toCompanyId: string;
  relation: "parentOf" | "linkedTo" | "controlledBy" | "beneficialOwnerOf";
  confidence: Confidence;
  note?: string | null;
  sourceUrl: string;
}

export interface Designation {
  id: string;
  appliesToType: "vessel" | "company";
  appliesToId: string;
  listName: string;
  nature: DesignationNature;
  program: string | null;
  designationDate: string | null;
  currentStatus: DesignationStatus;
  statusVerifiedAt: string | null;
  statusSource: string | null;
  dateRemoved: string | null;
  authorityId: string;
  uniqueId?: string | null;
  statementOfReasons?: string | null;
  sourceUrl: string;
}

// AIS-derived candidate port call (collector pipeline only; not part of the seed Dataset).
export interface PortCall {
  id: string;
  vesselImo: string;
  portId: string;
  arrival: string | null;
  departure: string | null;
  observationMethod: ObservationType;
  sourceUrl: string;
}

// A reported voyage from secondary analysis. NOT an AIS-confirmed port-call event.
export interface ReportedVoyage {
  id: string;
  vesselImo: string;
  originPortId: string;
  destinationPortId: string;
  reportedPeriod: string;
  timeGranularity: TimeGranularity;
  observationType: ObservationType;
  note?: string | null;
  sourceUrl: string;
}

export interface Dataset {
  vessels: Vessel[];
  companies: Company[];
  persons: Person[];
  ports: Port[];
  countries: Country[];
  regions: Region[];
  authorities: Authority[];
  designations: Designation[];
  ownership: OwnershipLink[];
  beneficialOwners: BeneficialOwnerLink[];
  companyLinks: CompanyLink[];
  reportedVoyages: ReportedVoyage[];
}
