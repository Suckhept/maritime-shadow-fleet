import type {
  Dataset,
  Vessel,
  Company,
  Country,
  Designation,
  OwnershipLink,
  CompanyLink,
  ReportedVoyage,
} from "./types";

import vessels from "../../data/seed/vessels.json";
import companies from "../../data/seed/companies.json";
import persons from "../../data/seed/persons.json";
import ports from "../../data/seed/ports.json";
import countries from "../../data/seed/countries.json";
import regions from "../../data/seed/regions.json";
import authorities from "../../data/seed/authorities.json";
import designations from "../../data/seed/designations.json";
import ownership from "../../data/seed/ownership.json";
import beneficialOwners from "../../data/seed/beneficialOwners.json";
import companyLinks from "../../data/seed/companylinks.json";
import reportedVoyages from "../../data/seed/reportedvoyages.json";

export const dataset: Dataset = {
  vessels: vessels as Vessel[],
  companies: companies as Company[],
  persons: persons as Dataset["persons"],
  ports: ports as Dataset["ports"],
  countries: countries as Country[],
  regions: regions as Dataset["regions"],
  authorities: authorities as Dataset["authorities"],
  designations: designations as Designation[],
  ownership: ownership as OwnershipLink[],
  beneficialOwners: beneficialOwners as Dataset["beneficialOwners"],
  companyLinks: companyLinks as CompanyLink[],
  reportedVoyages: reportedVoyages as ReportedVoyage[],
};

export const countryById = new Map(dataset.countries.map((c) => [c.id, c]));
export const companyById = new Map(dataset.companies.map((c) => [c.id, c]));
export const vesselByImo = new Map(dataset.vessels.map((v) => [v.imo, v]));
export const authorityById = new Map(dataset.authorities.map((a) => [a.id, a]));

export function flagCountry(v: Vessel): Country | null {
  return v.flagCountryId ? countryById.get(v.flagCountryId) ?? null : null;
}

export function ownersOf(imo: string): { link: OwnershipLink; company: Company }[] {
  return dataset.ownership
    .filter((o) => o.vesselImo === imo)
    .map((link) => ({ link, company: companyById.get(link.companyId)! }))
    .filter((x) => Boolean(x.company));
}

export function designationsForVessel(imo: string): Designation[] {
  return dataset.designations.filter(
    (d) => d.appliesToType === "vessel" && d.appliesToId === imo,
  );
}

export function designationsForCompany(companyId: string): Designation[] {
  return dataset.designations.filter(
    (d) => d.appliesToType === "company" && d.appliesToId === companyId,
  );
}

// Only designations confirmed currently in force. `current-unverified` is excluded.
export function activeDesignations(ds: Designation[]): Designation[] {
  return ds.filter((d) => d.currentStatus === "active");
}

export function vesselSanctionNature(imo: string): "binding" | "research" | "none" {
  const ds = designationsForVessel(imo);
  if (ds.some((d) => d.nature === "binding-sanction")) return "binding";
  if (ds.some((d) => d.nature === "research-designation")) return "research";
  return "none";
}

export function relatedCompaniesOf(companyId: string): { link: CompanyLink; parent: Company }[] {
  return dataset.companyLinks
    .filter((p) => p.toCompanyId === companyId)
    .map((link) => ({ link, parent: companyById.get(link.fromCompanyId)! }))
    .filter((x) => Boolean(x.parent));
}

// Collapse a set of designations into a single display status for colour/labels.
// Binding takes priority over research; within binding, active > current-unverified > removed.
export function displayStatusOf(ds: Designation[]): import("./theme").DisplayStatus {
  const binding = ds.filter((d) => d.nature === "binding-sanction");
  if (binding.some((d) => d.currentStatus === "active")) return "active";
  if (binding.some((d) => d.currentStatus === "current-unverified")) return "unverified";
  if (binding.length && binding.every((d) => d.currentStatus === "removed")) return "removed";
  if (ds.some((d) => d.nature === "research-designation")) return "research";
  return "none";
}

export function vesselDisplayStatus(imo: string) {
  return displayStatusOf(designationsForVessel(imo));
}
export function companyDisplayStatus(companyId: string) {
  return displayStatusOf(designationsForCompany(companyId));
}

export function voyagesForVessel(imo: string) {
  return dataset.reportedVoyages
    .filter((rv) => rv.vesselImo === imo)
    .map((rv) => ({
      rv,
      origin: dataset.ports.find((p) => p.id === rv.originPortId) ?? null,
      destination: dataset.ports.find((p) => p.id === rv.destinationPortId) ?? null,
    }));
}
