import { dataset, countryById, ownersOf, vesselDisplayStatus } from "./data";
import { COLORS, statusColor, STATUS_LABEL } from "./theme";

export interface ArcDatum {
  imo: string;
  vesselName: string;
  from: [number, number];
  fromName: string;
  to: [number, number];
  toName: string;          // the company's LISTED-ADDRESS COUNTRY (not the company itself)
  companyName: string;     // the related company
  predicates: string[];    // every predicate on this vessel→company link (deduped)
  color: [number, number, number];
  status: string;          // lifecycle: active | unverified | removed | research | none
  statusLabel: string;     // human label for the tooltip
}

export interface PointDatum {
  id: string;
  name: string;
  position: [number, number];
  kind: "flag" | "listedAddressCountry" | "port";
  color: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const C_COUNTRY = hexToRgb(COLORS.country);
const C_COMPANY = hexToRgb(COLORS.company);
const C_PORT = hexToRgb(COLORS.port);

// Each arc connects a vessel's flag state to the LISTED ADDRESS COUNTRY of a related company.
// The visual gap is informational: an open-registry flag vs. the address on the sanctions listing.
// A listed address is NOT a jurisdiction of incorporation or a place of control.
export function buildArcs(): ArcDatum[] {
  const byKey = new Map<string, ArcDatum>();
  for (const v of dataset.vessels) {
    const flag = v.flagCountryId ? countryById.get(v.flagCountryId) : null;
    if (!flag) continue;
    const st = vesselDisplayStatus(v.imo);
    for (const { company, link } of ownersOf(v.imo)) {
      const oc = company.addressCountryId ? countryById.get(company.addressCountryId) : null;
      if (!oc) continue;
      const key = `${v.imo}|${company.id}|${oc.id}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.predicates.includes(link.role)) existing.predicates.push(link.role);
        continue;
      }
      byKey.set(key, {
        imo: v.imo,
        vesselName: v.name,
        from: [flag.lon, flag.lat],
        fromName: flag.name,
        to: [oc.lon, oc.lat],
        toName: oc.name,
        companyName: company.name,
        predicates: [link.role],
        color: hexToRgb(statusColor(st)),
        status: st,
        statusLabel: STATUS_LABEL[st],
      });
    }
  }
  return [...byKey.values()];
}

export function buildPoints(): PointDatum[] {
  const pts = new Map<string, PointDatum>();
  for (const v of dataset.vessels) {
    const flag = v.flagCountryId ? countryById.get(v.flagCountryId) : null;
    if (flag) {
      pts.set(`flag:${flag.id}`, {
        id: `flag:${flag.id}`,
        name: flag.name,
        position: [flag.lon, flag.lat],
        kind: "flag",
        color: C_COUNTRY,
      });
    }
    for (const { company } of ownersOf(v.imo)) {
      const oc = company.addressCountryId ? countryById.get(company.addressCountryId) : null;
      if (oc) {
        pts.set(`addr:${oc.id}`, {
          id: `addr:${oc.id}`,
          name: oc.name,
          position: [oc.lon, oc.lat],
          kind: "listedAddressCountry",
          color: C_COMPANY,
        });
      }
    }
  }
  for (const p of dataset.ports) {
    if (p.referenceOnly) continue;
    if (p.lat != null && p.lon != null) {
      pts.set(`port:${p.id}`, {
        id: `port:${p.id}`,
        name: p.name,
        position: [p.lon, p.lat],
        kind: "port",
        color: C_PORT,
      });
    }
  }
  return [...pts.values()];
}

export interface VoyageDatum {
  imo: string;
  vesselName: string;
  from: [number, number];
  fromName: string;
  to: [number, number];
  toName: string;
  sourceUrl: string;
}

// Reported voyages -> arcs (origin -> destination). Secondary analysis, month-level; not AIS tracks.
export function buildVoyages(): VoyageDatum[] {
  const portById = new Map(dataset.ports.map((p) => [p.id, p]));
  const voyages: VoyageDatum[] = [];
  for (const rv of dataset.reportedVoyages) {
    const vessel = dataset.vessels.find((v) => v.imo === rv.vesselImo);
    const a = portById.get(rv.originPortId);
    const b = portById.get(rv.destinationPortId);
    if (!a || !b || a.lat == null || b.lat == null) continue;
    voyages.push({
      imo: rv.vesselImo,
      vesselName: vessel?.name ?? rv.vesselImo,
      from: [a.lon!, a.lat!],
      fromName: a.name,
      to: [b.lon!, b.lat!],
      toName: b.name,
      sourceUrl: rv.sourceUrl,
    });
  }
  return voyages;
}
