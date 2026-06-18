import Link from "next/link";
import { ownersOf, countryById, dataset } from "../../lib/data";
import { allVesselSignals, signalTally } from "../../lib/risk";

const vesselByImo = new Map(dataset.vessels.map((v) => [v.imo, v]));
function flagName(imo: string): string {
  const v = vesselByImo.get(imo);
  if (!v?.flagCountryId) return v?.flagStatus === "removed-from-source" ? "removed" : "—";
  return countryById.get(v.flagCountryId)?.name ?? v.flagCountryId;
}

const chip = (border: string, color: string, dashed = false): React.CSSProperties => ({
  fontSize: 11, padding: "1px 6px", borderRadius: 5,
  border: `1px ${dashed ? "dashed" : "solid"} ${border}`,
  background: dashed ? "transparent" : "var(--surface)", color, whiteSpace: "nowrap",
});

export default function RiskPage() {
  const rows = allVesselSignals();
  const tally = signalTally();

  return (
    <main className="wrap">
      <div className="eyebrow">Screening view</div>
      <h1>Screening signals (discrete)</h1>
      <p className="lead">
        Per-vessel <strong>discrete screening signals</strong> &mdash; there is deliberately{" "}
        <strong>no composite score and no high/elevated tiers</strong>, because a weighted sum with
        unpublished weights reads as a wrongdoing verdict. Each signal is individually sourced and grouped
        by kind: <strong>status</strong> (sanction facts; only a status-verified listing counts as a
        current sanction), <strong>observations</strong> (neutral, descriptive &mdash; e.g. open-registry
        flag), and <strong>completeness</strong> (data gaps, informational only). Counts within this
        dataset are labelled as such and are not real-world fleet sizes.
      </p>

      <h2>Signal frequency</h2>
      <p className="lead" style={{ marginBottom: 8 }}>How many of the {dataset.vessels.length} vessels carry each signal (a descriptive tally, not a ranking).</p>
      <table>
        <thead><tr><th>Signal</th><th>Kind</th><th>Vessels</th></tr></thead>
        <tbody>
          {tally.map((t) => (
            <tr key={t.key}>
              <td>{t.label}</td>
              <td><span className="mono" style={{ color: "var(--muted)" }}>{t.kind}</span></td>
              <td className="mono">{t.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Per vessel</h2>
      <table>
        <thead>
          <tr>
            <th>Vessel</th><th>Flag</th><th>Related company</th>
            <th>Status signals</th><th>Observations (neutral)</th><th>Data gaps (informational)</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            // all relations, grouped by company.id (dedup company, keep every predicate)
            const byCompany = new Map<string, { name: string; roles: string[] }>();
            for (const { company, link } of ownersOf(r.imo)) {
              const e = byCompany.get(company.id) ?? { name: company.name, roles: [] };
              if (!e.roles.includes(link.role)) e.roles.push(link.role);
              byCompany.set(company.id, e);
            }
            const companyRels = [...byCompany.values()];
            return (
              <tr key={r.imo}>
                <td>{r.name} <span className="mono" style={{ color: "var(--muted)" }}>· {r.imo}</span></td>
                <td>{flagName(r.imo)}</td>
                <td>{companyRels.length === 0 ? <span className="mono" style={{ color: "var(--muted)" }}>not recorded</span> : (
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {companyRels.map((c) => (
                      <span key={c.name}>{c.name} <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>— {c.roles.join(", ")}</span></span>
                    ))}
                  </span>
                )}</td>
                <td>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.status.length === 0 && <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>—</span>}
                    {r.status.map((s) => (
                      <span key={s.key} title={s.detail} className="mono" style={chip("var(--hairline)", "var(--text)")}>{s.label}</span>
                    ))}
                  </span>
                </td>
                <td>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.observations.length === 0 && <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>—</span>}
                    {r.observations.map((s) => (
                      <span key={s.key} title={s.detail} className="mono" style={chip("var(--hairline)", "var(--muted)")}>{s.label}</span>
                    ))}
                  </span>
                </td>
                <td>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.completeness.length === 0 && <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>—</span>}
                    {r.completeness.map((s) => (
                      <span key={s.key} title={s.detail} className="mono" style={chip("var(--hairline)", "var(--muted)", true)}>{s.label}</span>
                    ))}
                  </span>
                </td>
                <td><Link className="mono" href={`/trace?imo=${r.imo}`}>&rarr; trace</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="note">
        Methodology &mdash; no weighted score is computed. Signals are discrete and individually sourced:
        a binding listing counts as a <em>current</em> sanction only when a dated source confirms it
        (otherwise it is shown as &ldquo;listed in the cited action; current status not verified&rdquo;).
        Open-registry classification uses the{" "}
        <a href="https://www.itfglobal.org/en/sector/seafarers/flags-of-convenience" target="_blank" rel="noreferrer">ITF Flags of Convenience list</a>{" "}
        (static reference; being an open registry is descriptive, not wrongdoing). &ldquo;Flag &ne;
        related-company listed address&rdquo; is a neutral observation; a listed address is not a
        jurisdiction of incorporation or a place of control. Cluster counts are explicitly{" "}
        <em>within this dataset subset</em>, not real fleet sizes. Data gaps are informational and never
        imply wrongdoing.
      </div>
    </main>
  );
}
