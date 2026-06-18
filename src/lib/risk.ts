/**
 * risk.ts — SCREENING SIGNALS (discrete), not a score.
 *
 * Per second-round review, there is NO composite score and NO high/elevated tiers: a weighted sum with
 * unpublished weights reads as a wrongdoing verdict. Instead each vessel exposes discrete, individually
 * sourced signals, grouped by kind:
 *   - status      — sanction facts (binding listing; only ACTIVE counts as a current sanction).
 *   - observation — neutral, descriptive observations (open-registry flag; flag vs listed-address;
 *                   owner clustering WITHIN THIS DATASET). Not wrongdoing.
 *   - completeness— data gaps (no flag / no MMSI / no incorporation). Informational only.
 *
 * Open-registry classification reference: ITF Flags of Convenience list
 * (https://www.itfglobal.org/en/sector/seafarers/flags-of-convenience). Descriptive, not wrongdoing.
 */
import {
  dataset,
  ownersOf,
  designationsForVessel,
  designationsForCompany,
  activeDesignations,
} from "./data";

const OPEN_REGISTRIES = new Set([
  "PAN", "LBR", "MHL", "GAB", "PLW", "BHS", "TZA", "MLT", "CYP", "COK",
  "VCT", "SLE", "CMR", "MNG", "TGO", "BRB", "ATG", "VUT", "BLZ", "KNA",
]);

export type SignalKind = "status" | "observation" | "completeness";
export interface Signal {
  key: string;
  kind: SignalKind;
  label: string;
  detail: string;
}

// owner -> set of UNIQUE vessel IMOs in THIS dataset (dataset-local, not a real fleet size).
// Keyed by Set so a company with two relations to the same hull (e.g. Winky → Rosalind) counts as 1 vessel.
const datasetFleet = new Map<string, Set<string>>();
for (const o of dataset.ownership) {
  if (!datasetFleet.has(o.companyId)) datasetFleet.set(o.companyId, new Set());
  datasetFleet.get(o.companyId)!.add(o.vesselImo);
}

export function screeningSignals(imo: string): Signal[] {
  const vessel = dataset.vessels.find((v) => v.imo === imo);
  if (!vessel) return [];
  const out: Signal[] = [];
  const owners = ownersOf(imo);
  const vDes = designationsForVessel(imo);

  const binding = vDes.filter((d) => d.nature === "binding-sanction");
  if (binding.length) {
    const anyActive = binding.some((d) => d.currentStatus === "active");
    const allRemoved = binding.every((d) => d.currentStatus === "removed");
    if (allRemoved) {
      const when = binding.map((d) => d.dateRemoved).filter(Boolean)[0];
      out.push({ key: "binding", kind: "status", label: "Sanction removed (delisted)", detail: `delisted${when ? ` ${when}` : ""} — historical case, not a current sanction` });
    } else {
      out.push({
        key: "binding", kind: "status",
        label: anyActive ? "Binding sanction (active)" : "Binding sanction listed (current status unverified)",
        detail: `${[...new Set(binding.map((d) => d.program ?? d.listName))].join(", ")}${anyActive ? "" : " — listed in the cited action; present SDN status not re-checked"}`,
      });
    }
  }
  if (vDes.some((d) => d.nature === "research-designation")) {
    out.push({ key: "research", kind: "status", label: "Research designation", detail: "flagged by a research/advocacy tracker, not a binding authority" });
  }

  const sanctionedOwners = owners.filter(({ company }) => designationsForCompany(company.id).some((d) => d.nature === "binding-sanction"));
  if (sanctionedOwners.length) {
    const anyActive = sanctionedOwners.some(({ company }) => activeDesignations(designationsForCompany(company.id)).length > 0);
    const allRemoved = sanctionedOwners.every(({ company }) => designationsForCompany(company.id).filter((d) => d.nature === "binding-sanction").every((d) => d.currentStatus === "removed"));
    out.push({ key: "related-co-sanctioned", kind: "status",
      label: allRemoved ? "Related company delisted" : anyActive ? "Related company sanctioned (active)" : "Related company sanctioned (status unverified)",
      detail: sanctionedOwners.map(({ company }) => company.name).join(", ") });
  }

  if (vessel.flagCountryId && OPEN_REGISTRIES.has(vessel.flagCountryId)) {
    out.push({ key: "open-registry", kind: "observation", label: "Open-registry flag", detail: `flag ${vessel.flagCountryId} is an open registry (ITF list) — descriptive, not wrongdoing` });
  }

  const ownerAddrCountries = new Set(owners.map(({ company }) => company.addressCountryId).filter(Boolean) as string[]);
  if (vessel.flagCountryId && ownerAddrCountries.size > 0 && !ownerAddrCountries.has(vessel.flagCountryId)) {
    out.push({ key: "flag-address-gap", kind: "observation", label: "Flag ≠ related-company listed address", detail: `flag ${vessel.flagCountryId} vs listed address ${[...ownerAddrCountries].join("/")} (a listed address is not a jurisdiction of control)` });
  }

  const maxFleet = Math.max(0, ...owners.map(({ company }) => datasetFleet.get(company.id)?.size ?? 0));
  if (maxFleet >= 5) {
    out.push({ key: "dataset-cluster", kind: "observation", label: `Related company on ${maxFleet} vessels in this dataset`, detail: "count within THIS dataset subset only — not a real-world fleet size" });
  }

  return out;
}

export function completenessFlags(imo: string): Signal[] {
  const vessel = dataset.vessels.find((v) => v.imo === imo);
  if (!vessel) return [];
  const flags: Signal[] = [];
  if (!vessel.flagCountryId) flags.push({ key: "no-flag", kind: "completeness", label: vessel.flagStatus === "removed-from-source" ? "Flag removed from source" : "No flag recorded", detail: vessel.flagStatus === "removed-from-source" ? "the source struck the flag without replacement; no country inferred" : "flag not present in the source used" });
  if (!vessel.mmsi) flags.push({ key: "no-mmsi", kind: "completeness", label: "No MMSI recorded", detail: "MMSI not present in the source used" });
  for (const { company } of ownersOf(imo)) {
    if (!company.jurisdiction) { flags.push({ key: "no-incorp", kind: "completeness", label: "Related-company incorporation not recorded", detail: `${company.name}: jurisdiction of incorporation not from a registry (a data gap, not an inference)` }); break; }
  }
  return flags;
}

export interface VesselSignals {
  imo: string;
  name: string;
  status: Signal[];
  observations: Signal[];
  completeness: Signal[];
}

export function allVesselSignals(): VesselSignals[] {
  return dataset.vessels
    .map((v) => {
      const sigs = screeningSignals(v.imo);
      return {
        imo: v.imo, name: v.name,
        status: sigs.filter((s) => s.kind === "status"),
        observations: sigs.filter((s) => s.kind === "observation"),
        completeness: completenessFlags(v.imo),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// How many vessels exhibit each signal (a descriptive tally, not a ranking).
export function signalTally(): { key: string; label: string; kind: SignalKind; count: number }[] {
  const m = new Map<string, { label: string; kind: SignalKind; count: number }>();
  for (const v of dataset.vessels) {
    for (const s of [...screeningSignals(v.imo), ...completenessFlags(v.imo)]) {
      const e = m.get(s.key) ?? { label: s.label.replace(/\(.*\)/, "").trim(), kind: s.kind, count: 0 };
      e.count++;
      m.set(s.key, e);
    }
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);
}
