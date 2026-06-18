import {
  dataset,
  companyById,
  countryById,
  ownersOf,
  designationsForVessel,
  designationsForCompany,
  vesselDisplayStatus,
  companyDisplayStatus,
  relatedCompaniesOf,
  voyagesForVessel,
} from "./data";
import { designationPresentation } from "./status";
import { COLORS, statusColor } from "./theme";
import type { Designation } from "./types";

export interface CyNode {
  data: {
    id: string;
    label: string;
    kind: "vessel" | "company" | "country" | "authority" | "designation" | "person" | "port";
    color: string;
    sub?: string;
  };
}
export interface CyEdge {
  data: {
    id: string; source: string; target: string; label: string; color: string;
    predicate?: string; confidence?: string; note?: string | null; evidenceDate?: string | null;
    predicateEvidenceUrl?: string; listingSourceUrl?: string; evidenceQuote?: string;
    status?: string; statusVerifiedAt?: string | null; dateRemoved?: string | null; statusSourceUrl?: string | null;
  };
}
export type CyElements = { nodes: CyNode[]; edges: CyEdge[] };

const ROLE_LABEL: Record<string, string> = {
  registeredOwner: "registered owner",
  beneficialOwner: "beneficially owned by",
  interestHolder: "property interest (OFAC)",
  ownerOperator: "owner / operator (UK)",
  operator: "operator",
  shipManager: "ship manager",
  ismManager: "ISM manager",
  linkedTo: "linked to",
};
const REL_LABEL: Record<string, string> = {
  parentOf: "parent of",
  linkedTo: "linked to",
  controlledBy: "controlled by",
  beneficialOwnerOf: "beneficial owner of",
};
const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;
const relLabel = (r: string, conf: string) => (conf === "confirmed" ? REL_LABEL[r] ?? r : `${REL_LABEL[r] ?? r} (${conf})`);
const labelSuffix = (s: string) => (s === "active" ? "" : s === "removed" ? " (removed)" : s === "research" ? "" : " (status unverified)");

const companyColor = (id: string) => {
  const st = companyDisplayStatus(id);
  return st === "none" ? COLORS.company : statusColor(st);
};

function vesselNode(imo: string): CyNode {
  const v = dataset.vessels.find((x) => x.imo === imo)!;
  return { data: { id: `v:${imo}`, label: v.name, kind: "vessel", color: statusColor(vesselDisplayStatus(imo)), sub: `IMO ${imo}` } };
}
function companyNode(id: string): CyNode {
  const c = companyById.get(id)!;
  return { data: { id: `c:${id}`, label: c.name, kind: "company", color: companyColor(id), sub: c.imoCompanyNumber ? `IMO ${c.imoCompanyNumber}` : "no IMO co. no." } };
}
function authorityNode(id: string): CyNode {
  const a = dataset.authorities.find((x) => x.id === id)!;
  return { data: { id: `a:${id}`, label: a.name, kind: "authority", color: COLORS.authority } };
}

// One presentation -> one designation edge. Used everywhere so status colour/label/links never diverge.
function desigEdge(d: Designation, source: string, target: string, idPrefix: string): CyEdge {
  const p = designationPresentation(d);
  return { data: {
    id: `${idPrefix}:${d.id}`, source, target,
    label: `${d.program ?? d.listName}${labelSuffix(p.status)}`, color: p.color,
    predicateEvidenceUrl: p.listingSourceUrl, listingSourceUrl: p.listingSourceUrl, statusSourceUrl: p.statusSourceUrl,
    status: p.status, statusVerifiedAt: p.statusVerifiedAt, dateRemoved: p.dateRemoved,
    note: d.statementOfReasons ?? null,
  } };
}

export function buildNetwork(): CyElements {
  const nodes = new Map<string, CyNode>();
  const edges: CyEdge[] = [];
  const add = (n: CyNode) => nodes.set(n.data.id, n);

  for (const v of dataset.vessels) {
    add(vesselNode(v.imo));
    for (const { link, company } of ownersOf(v.imo)) {
      add(companyNode(company.id));
      edges.push({ data: {
        id: `e:rel:${v.imo}:${company.id}:${link.role}`, source: `v:${v.imo}`, target: `c:${company.id}`,
        label: roleLabel(link.role), color: COLORS.edge, predicate: link.role, confidence: link.confidence,
        note: link.note ?? null, evidenceDate: link.evidenceDate, predicateEvidenceUrl: link.predicateEvidenceUrl,
        listingSourceUrl: link.listingSourceUrl, evidenceQuote: link.evidenceQuote,
      } });
    }
    for (const d of designationsForVessel(v.imo)) { add(authorityNode(d.authorityId)); edges.push(desigEdge(d, `a:${d.authorityId}`, `v:${v.imo}`, "e:desig")); }
  }

  for (const c of dataset.companies) {
    for (const d of designationsForCompany(c.id)) {
      if (!nodes.has(`c:${c.id}`)) add(companyNode(c.id));
      add(authorityNode(d.authorityId));
      edges.push(desigEdge(d, `a:${d.authorityId}`, `c:${c.id}`, "e:cdesig"));
    }
  }

  for (const p of dataset.companyLinks) {
    if (!nodes.has(`c:${p.fromCompanyId}`)) add(companyNode(p.fromCompanyId));
    if (!nodes.has(`c:${p.toCompanyId}`)) add(companyNode(p.toCompanyId));
    edges.push({ data: {
      id: `e:clink:${p.fromCompanyId}:${p.toCompanyId}`, source: `c:${p.fromCompanyId}`, target: `c:${p.toCompanyId}`,
      label: relLabel(p.relation, p.confidence), color: COLORS.edge, predicate: p.relation, confidence: p.confidence,
      note: p.note ?? null, predicateEvidenceUrl: p.sourceUrl,
    } });
  }

  return { nodes: [...nodes.values()], edges };
}

export function buildTrace(imo: string): CyElements {
  const nodes = new Map<string, CyNode>();
  const edges: CyEdge[] = [];
  const add = (n: CyNode) => nodes.set(n.data.id, n);

  const v = dataset.vessels.find((x) => x.imo === imo);
  if (!v) return { nodes: [], edges: [] };
  add(vesselNode(imo));

  if (v.flagCountryId) {
    const country = countryById.get(v.flagCountryId);
    if (country) {
      add({ data: { id: `co:${country.id}`, label: country.name, kind: "country", color: COLORS.country, sub: "flag state" } });
      edges.push({ data: { id: `e:flag:${imo}`, source: `co:${country.id}`, target: `v:${imo}`, label: "flagged in", color: COLORS.edge, predicateEvidenceUrl: v.flagSourceUrl ?? v.sourceUrl, note: v.flagVerifiedAt ? `flag per OFAC entry (verified ${v.flagVerifiedAt})` : "flag per the cited listing source" } });
    }
  }

  for (const { link, company } of ownersOf(imo)) {
    add(companyNode(company.id));
    edges.push({ data: {
      id: `e:rel:${imo}:${company.id}`, source: `v:${imo}`, target: `c:${company.id}`,
      label: roleLabel(link.role), color: COLORS.edge, predicate: link.role, confidence: link.confidence,
      note: link.note ?? null, evidenceDate: link.evidenceDate, predicateEvidenceUrl: link.predicateEvidenceUrl,
      listingSourceUrl: link.listingSourceUrl, evidenceQuote: link.evidenceQuote,
    } });
    if (company.addressCountryId) {
      const cc = countryById.get(company.addressCountryId);
      if (cc) {
        add({ data: { id: `co:${cc.id}`, label: cc.name, kind: "country", color: COLORS.country, sub: "listed address" } });
        edges.push({ data: { id: `e:caddr:${company.id}`, source: `c:${company.id}`, target: `co:${cc.id}`, label: "listed address in", color: COLORS.edge, predicateEvidenceUrl: company.sourceUrl, note: "listed address country — not a jurisdiction of incorporation or place of control" } });
      }
    }
    for (const d of designationsForCompany(company.id)) { add(authorityNode(d.authorityId)); edges.push(desigEdge(d, `a:${d.authorityId}`, `c:${company.id}`, "e:cdesig")); }
    for (const { link: pl, parent } of relatedCompaniesOf(company.id)) {
      add(companyNode(parent.id));
      edges.push({ data: { id: `e:clink:${parent.id}:${company.id}`, source: `c:${parent.id}`, target: `c:${company.id}`, label: relLabel(pl.relation, pl.confidence), color: COLORS.edge, predicate: pl.relation, confidence: pl.confidence, note: pl.note ?? null, predicateEvidenceUrl: pl.sourceUrl } });
      for (const d of designationsForCompany(parent.id)) { add(authorityNode(d.authorityId)); edges.push(desigEdge(d, `a:${d.authorityId}`, `c:${parent.id}`, "e:cdesig")); }
    }
  }

  for (const d of designationsForVessel(imo)) { add(authorityNode(d.authorityId)); edges.push(desigEdge(d, `a:${d.authorityId}`, `v:${imo}`, "e:desig")); }

  for (const { rv, origin, destination } of voyagesForVessel(imo)) {
    const note = `Reported voyage (${rv.observationType}, ${rv.timeGranularity}-level, ${rv.reportedPeriod}) — not an AIS-confirmed port call.`;
    if (origin) {
      add({ data: { id: `p:${origin.id}`, label: origin.name, kind: "port", color: COLORS.port, sub: "reported origin" } });
      edges.push({ data: { id: `e:rv:o:${rv.id}`, source: `v:${imo}`, target: `p:${origin.id}`, label: `reported origin ${rv.reportedPeriod}`, color: COLORS.port, predicateEvidenceUrl: rv.sourceUrl, note } });
    }
    if (destination) {
      add({ data: { id: `p:${destination.id}`, label: destination.name, kind: "port", color: COLORS.port, sub: "reported destination" } });
      edges.push({ data: { id: `e:rv:d:${rv.id}`, source: `v:${imo}`, target: `p:${destination.id}`, label: `reported destination ${rv.reportedPeriod}`, color: COLORS.port, predicateEvidenceUrl: rv.sourceUrl, note } });
    }
  }

  return { nodes: [...nodes.values()], edges };
}
