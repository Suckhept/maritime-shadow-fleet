// SINGLE source of truth for how a designation is presented across ALL views (Map, Network, Trace,
// Overview, Screening). Any status colour/label/link must come from here — no ad-hoc ternaries.
import type { Designation } from "./types";
import { statusColor, STATUS_LABEL, type DisplayStatus } from "./theme";

export interface DesignationPresentation {
  status: DisplayStatus;            // active | unverified | removed | research | none
  label: string;                    // human label for the status
  color: string;                    // hex colour for the status
  designationDate: string | null;   // when it was listed (the cited action)
  statusVerifiedAt: string | null;  // when current status was confirmed (active/removed only)
  dateRemoved: string | null;       // delisting date (removed only)
  listingSourceUrl: string;         // document that LISTED the entity
  statusSourceUrl: string | null;   // document that proves the CURRENT status (delisting / verification)
}

export function designationPresentation(d: Designation): DesignationPresentation {
  const status: DisplayStatus =
    d.nature === "research-designation" ? "research"
    : d.currentStatus === "active" ? "active"
    : d.currentStatus === "removed" ? "removed"
    : "unverified";
  return {
    status,
    label: STATUS_LABEL[status],
    color: statusColor(status),
    designationDate: d.designationDate,
    statusVerifiedAt: d.statusVerifiedAt,
    dateRemoved: d.dateRemoved,
    listingSourceUrl: d.sourceUrl,
    statusSourceUrl: d.statusSource ?? null,
  };
}
