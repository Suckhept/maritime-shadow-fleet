// Color encodes designation nature consistently across every view.
// This is the explorer's one signature: a legend you learn once and read everywhere.
export const COLORS = {
  binding: "#E24B4A", // binding sanction, status-verified active
  unverified: "#C77D3A", // binding listing, current status NOT re-checked (muted amber-red)
  removed: "#5B6472", // delisted / removed (grey — must not read as an active sanction)
  research: "#EF9F27", // research / advocacy designation (UANI / KSE)
  vessel: "#85B7EB", // vessel node (neutral, no designation)
  company: "#5DCAA5", // company / ownership structure
  person: "#D4537E", // person (UBO leads)
  authority: "#7F77DD", // issuing authority
  country: "#888780", // country / geography
  port: "#EF9F27", // port (movement)
  edge: "#37466b", // graph edges
  ink: "#0E1726",
  surface: "#161F33",
  surfaceAlt: "#1B2540",
  hairline: "#2A3655",
  text: "#E6EAF0",
  textMuted: "#8A95A8",
} as const;

export type DisplayStatus = "active" | "removed" | "unverified" | "research" | "none";

export function natureColor(nature: "binding" | "research" | "none"): string {
  if (nature === "binding") return COLORS.binding;
  if (nature === "research") return COLORS.research;
  return COLORS.vessel;
}

export function statusColor(s: DisplayStatus): string {
  switch (s) {
    case "active": return COLORS.binding;
    case "unverified": return COLORS.unverified;
    case "removed": return COLORS.removed;
    case "research": return COLORS.research;
    default: return COLORS.vessel;
  }
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  active: "Active (verified)",
  unverified: "Listed — current status unverified",
  removed: "Removed (delisted)",
  research: "Research designation",
  none: "No designation",
};
