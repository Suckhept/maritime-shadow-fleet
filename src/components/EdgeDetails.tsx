"use client";
import type { CyEdge } from "../lib/graph";

export type EdgeData = CyEdge["data"];

// Shared edge-provenance panel for the network and trace graphs.
export default function EdgeDetails({ edge, onClose }: { edge: EdgeData | null; onClose: () => void }) {
  if (!edge) return null;
  const row = (k: string, v: React.ReactNode) =>
    v ? (
      <div style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.45 }}>
        <span className="mono" style={{ color: "var(--muted)", minWidth: 96 }}>{k}</span>
        <span style={{ color: "var(--text)" }}>{v}</span>
      </div>
    ) : null;
  return (
    <div
      style={{
        position: "absolute", right: 12, top: 12, width: 320, maxWidth: "calc(100% - 24px)",
        background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 10,
        padding: "12px 14px", zIndex: 20, boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>edge provenance</span>
        <button onClick={onClose} className="mono" style={{ fontSize: 11, background: "transparent", border: "1px solid var(--hairline)", borderRadius: 5, color: "var(--muted)", cursor: "pointer", padding: "1px 7px" }}>close</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {row("relation", <span className="mono">{edge.label}</span>)}
        {row("predicate", edge.predicate ? <span className="mono">{edge.predicate}</span> : null)}
        {row("status", edge.status ? <span className="mono">{edge.status}</span> : null)}
        {row("verified", edge.statusVerifiedAt ? <span className="mono">{edge.statusVerifiedAt}</span> : null)}
        {row("removed", edge.dateRemoved ? <span className="mono">{edge.dateRemoved}</span> : null)}
        {row("confidence", edge.confidence ? <span className="mono">[{edge.confidence}]</span> : null)}
        {row("evidence", edge.evidenceQuote ? <span>&ldquo;{edge.evidenceQuote}&rdquo;</span> : null)}
        {row("reported as of", edge.evidenceDate ? <span className="mono">{edge.evidenceDate}<span style={{ color: "var(--muted)" }}> — current role status not re-verified</span></span> : null)}
        {row("note", edge.note ?? null)}
        {row("predicate proof", edge.predicateEvidenceUrl ? <a className="mono" href={edge.predicateEvidenceUrl} target="_blank" rel="noreferrer">{shortUrl(edge.predicateEvidenceUrl)}</a> : null)}
        {row("listing action", edge.listingSourceUrl && edge.listingSourceUrl !== edge.predicateEvidenceUrl ? <a className="mono" href={edge.listingSourceUrl} target="_blank" rel="noreferrer">{shortUrl(edge.listingSourceUrl)}</a> : null)}
        {row(edge.dateRemoved ? "delisting source" : "current-status source", edge.statusSourceUrl ? <a className="mono" href={edge.statusSourceUrl} target="_blank" rel="noreferrer">{shortUrl(edge.statusSourceUrl)}</a> : null)}
      </div>
    </div>
  );
}

function shortUrl(u: string): string {
  try {
    const url = new URL(u);
    const tail = url.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "";
    return `${url.hostname.replace(/^www\./, "")}/${tail}`.slice(0, 44);
  } catch {
    return u.slice(0, 44);
  }
}
