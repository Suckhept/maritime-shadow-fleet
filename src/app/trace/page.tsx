"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  dataset,
  ownersOf,
  designationsForVessel,
  designationsForCompany,
  countryById,
  authorityById,
  relatedCompaniesOf,
  voyagesForVessel,
} from "../../lib/data";
import { designationPresentation } from "../../lib/status";
import Legend from "../../components/Legend";

// status -> pill CSS class (single mapping; mirrors the shared designationPresentation colours)
const PILL: Record<string, string> = { active: "binding", removed: "removed", unverified: "unverified", research: "research", none: "unverified" };

const TraceView = dynamic(() => import("../../components/TraceView"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "var(--muted)" }}>loading trace…</div>,
});

const PREDICATE: Record<string, string> = {
  registeredOwner: "registered owner", beneficialOwner: "beneficially owned by",
  interestHolder: "property interest (OFAC)", ownerOperator: "owner / operator (UK)",
  operator: "operator", shipManager: "ship manager", ismManager: "ISM manager", linkedTo: "linked to",
};

function TraceInner() {
  const params = useSearchParams();
  const initial = params.get("imo") ?? dataset.vessels[0]?.imo ?? "";
  const [imo, setImo] = useState(initial);

  const vessel = dataset.vessels.find((v) => v.imo === imo) ?? dataset.vessels[0];
  const owners = ownersOf(vessel.imo);
  const vDes = designationsForVessel(vessel.imo);
  const flag = vessel.flagCountryId ? countryById.get(vessel.flagCountryId)?.name
    : vessel.flagStatus === "removed-from-source" ? "removed from source" : "—";
  const voyages = voyagesForVessel(vessel.imo);

  return (
    <main className="wrap">
      <div className="eyebrow">Trace view</div>
      <h1>Follow one vessel, end to end</h1>
      <p className="lead">
        Flag state → vessel → related company → the authority that listed it. Each relation shows its
        predicate, the action that listed the two entities, and the document that proves the predicate
        (with the quoted wording). Click any edge in the graph for the same provenance.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0 10px" }}>
        <span className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>vessel</span>
        <select className="select" value={imo} onChange={(e) => setImo(e.target.value)}>
          {dataset.vessels.map((v) => (
            <option key={v.imo} value={v.imo}>
              {v.name} · {v.imo}
            </option>
          ))}
        </select>
      </div>

      <Legend kinds />
      <div className="viewport">
        <TraceView imo={vessel.imo} />
      </div>

      <h2>Provenance</h2>
      <p className="lead" style={{ marginBottom: 8 }}>
        {vessel.name} · IMO <span className="mono">{vessel.imo}</span>
        {vessel.mmsi && <> · MMSI <span className="mono">{vessel.mmsi}</span></>} · flag {flag}
        {vessel.vesselType ? ` · ${vessel.vesselType}` : ""}
      </p>

      <table>
        <thead>
          <tr><th>Relation</th><th>To</th><th>Evidence (quoted wording) &amp; confidence</th><th>Listing</th><th>Predicate proof</th></tr>
        </thead>
        <tbody>
          {owners.map(({ link, company }) => {
            const cDes = designationsForCompany(company.id)[0];
            return (
              <tr key={company.id}>
                <td className="mono">{PREDICATE[link.role] ?? link.role}</td>
                <td>
                  {company.name}
                  {company.imoCompanyNumber ? <> <span className="mono" style={{ color: "var(--muted)" }}>· IMO co. {company.imoCompanyNumber}</span></> : ""}
                  {cDes && <> · <span className={`pill ${PILL[designationPresentation(cDes).status]}`}><span className="dot" /> {cDes.program ?? cDes.listName}{cDes.currentStatus === "active" ? "" : cDes.currentStatus === "removed" ? " (removed)" : " (status unverified)"}</span></>}
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 11, color: link.confidence === "confirmed" ? "var(--text)" : "var(--muted)" }}>[{link.confidence}]</span>
                  <span style={{ color: "var(--text)" }}> “{link.evidenceQuote}”</span>
                  {link.evidenceDate ? <span className="mono" style={{ color: "var(--muted)" }}> · as of {link.evidenceDate}</span> : ""}
                  {link.roleCurrency === "unverified" ? <span className="mono" style={{ color: "var(--warn, #b6862c)" }}> · role currency unverified</span> : ""}
                  {link.note ? <span style={{ color: "var(--muted)" }}> — {link.note}</span> : ""}
                </td>
                <td><a className="mono" href={link.listingSourceUrl} target="_blank" rel="noreferrer">listing</a></td>
                <td><a className="mono" href={link.predicateEvidenceUrl} target="_blank" rel="noreferrer">proof</a></td>
              </tr>
            );
          })}
          {owners.flatMap(({ company }) =>
            relatedCompaniesOf(company.id).map(({ link: pl, parent }) => {
              const rel: Record<string, string> = { parentOf: "parent of", linkedTo: "linked to", controlledBy: "controlled by", beneficialOwnerOf: "beneficial owner of" };
              return (
                <tr key={`${parent.id}->${company.id}`}>
                  <td className="mono">{rel[pl.relation] ?? pl.relation}</td>
                  <td>{parent.name} <span className="mono" style={{ color: "var(--muted)" }}>→ {company.name}</span></td>
                  <td>
                    <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>[{pl.confidence}]</span>
                    {pl.note ? <span style={{ color: "var(--muted)" }}> {pl.note}</span> : ""}
                  </td>
                  <td colSpan={2}><a className="mono" href={pl.sourceUrl} target="_blank" rel="noreferrer">source</a></td>
                </tr>
              );
            })
          )}
          {vDes.map((d) => (
            <tr key={d.id}>
              <td className="mono">designation</td>
              <td>{authorityById.get(d.authorityId)?.name ?? d.authorityId}</td>
              <td>
                <span className={`pill ${PILL[designationPresentation(d).status]}`}>
                  <span className="dot" /> {d.listName}{d.program ? ` · ${d.program}` : ""}
                </span>
                {d.designationDate && <span className="mono" style={{ color: "var(--muted)" }}> · listed {d.designationDate}</span>}
                <span className="mono" style={{ color: d.currentStatus === "active" ? "var(--text)" : "var(--muted)" }}>
                  {" "}· {d.currentStatus === "active" ? `active (verified ${d.statusVerifiedAt})` : d.currentStatus === "removed" ? `removed ${d.dateRemoved ?? ""}`.trim() : "current status not verified"}
                </span>
                {d.uniqueId && <span className="mono" style={{ color: "var(--muted)" }}> · {d.uniqueId}</span>}
              </td>
              <td colSpan={2}>
                <a className="mono" href={d.sourceUrl} target="_blank" rel="noreferrer">listing</a>
                {d.statusSource ? <> · <a className="mono" href={d.statusSource} target="_blank" rel="noreferrer">{d.currentStatus === "removed" ? "delisting" : "status"} source</a></> : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {voyages.length > 0 && (
        <>
          <h2>Reported voyage</h2>
          <p className="lead" style={{ marginBottom: 8 }}>
            A single reported voyage from secondary analysis (not live AIS, not a sanctions listing).
            Resolution is as stated in the source.
          </p>
          <table>
            <thead>
              <tr><th>Origin</th><th>Destination</th><th>Reported period</th><th>Granularity</th><th>Observation</th><th>Source</th></tr>
            </thead>
            <tbody>
              {voyages.map(({ rv, origin, destination }) => (
                <tr key={rv.id}>
                  <td>{origin?.name ?? rv.originPortId}{origin?.countryId ? <span className="mono" style={{ color: "var(--muted)" }}> · {countryById.get(origin.countryId)?.name}</span> : ""}</td>
                  <td>{destination?.name ?? rv.destinationPortId}{destination?.countryId ? <span className="mono" style={{ color: "var(--muted)" }}> · {countryById.get(destination.countryId)?.name}</span> : ""}</td>
                  <td className="mono">{rv.reportedPeriod}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{rv.timeGranularity}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{rv.observationType}</td>
                  <td><a className="mono" href={rv.sourceUrl} target="_blank" rel="noreferrer">source</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="note">
        {voyages.length > 0 ? (
          <>
            The voyage above is one reported voyage (secondary analysis, month-level), not an
            AIS-confirmed track. A forward AIS collector ships in the repo
            (<span className="mono">scripts/collect-ais.ts</span>) but is not wired into this view; dense
            position history is out of scope for this submission.
          </>
        ) : (
          <>
            No reported voyage is recorded for this vessel. Dense position history is out of scope; the
            repo ships a forward AIS collector (<span className="mono">scripts/collect-ais.ts</span>) that
            is not wired into this view.
          </>
        )}
      </div>
    </main>
  );
}

export default function TracePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--muted)" }}>loading…</div>}>
      <TraceInner />
    </Suspense>
  );
}
