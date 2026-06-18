import Link from "next/link";
import {
  dataset,
  ownersOf,
  designationsForVessel,
  countryById,
  vesselDisplayStatus,
} from "../lib/data";
import { STATUS_LABEL } from "../lib/theme";
import Legend from "../components/Legend";

const ROLE_SHORT: Record<string, string> = {
  registeredOwner: "registered owner",
  beneficialOwner: "beneficial owner",
  interestHolder: "property interest",
  ownerOperator: "owner / operator",
  operator: "operator",
  shipManager: "ship manager",
  ismManager: "ISM manager",
  linkedTo: "linked to",
};

export default function Overview() {
  const unverified = dataset.designations.filter((d) => d.currentStatus === "current-unverified").length;
  const removed = dataset.designations.filter((d) => d.currentStatus === "removed").length;
  const isActive = (d: typeof dataset.designations[number]) => d.currentStatus === "active";
  const activeOfac = dataset.designations.filter((d) => isActive(d) && d.authorityId === "ofac").length;
  const activeUk = dataset.designations.filter((d) => isActive(d) && d.authorityId !== "ofac").length;
  const removedOfac = dataset.designations.filter((d) => d.currentStatus === "removed" && d.authorityId === "ofac").length;

  return (
    <main className="wrap">
      <div className="eyebrow">World affairs · GRC-20 dataset + explorer</div>
      <h1>Maritime Shadow Fleet &amp; Energy Provenance Map</h1>
      <p className="lead">
        Trace how sanctioned oil moves through the world — from vessel to a related company to a
        destination. Every vessel, company and listing below is backed by an official sanctions action
        (OFAC / UK), with each relation predicate matched to the exact wording of a proving document.
        Every OFAC SDN record was <strong>re-verified against the live OFAC Sanctions List Search on
        2026-06-15</strong> (SDN List version 2026-06-11): {activeOfac} confirmed currently listed, {removedOfac} returned no
        results (delisted), and one hull (IMO 9277735) is dual-listed under both UK-Russia and
        OFAC-Venezuela programmes. Movement is one secondary-sourced reported voyage; dense AIS history
        is out of scope.
      </p>

      <div className="grid-cards">
        <div className="card"><div className="n">{dataset.vessels.length}</div><div className="k">vessels (IMO-keyed)</div></div>
        <div className="card"><div className="n">{dataset.companies.length}</div><div className="k">related companies</div></div>
        <div className="card"><div className="n">{activeOfac}</div><div className="k">OFAC active (verified)</div></div>
        <div className="card"><div className="n">{activeUk}</div><div className="k">UK active (verified)</div></div>
        <div className="card"><div className="n">{removed}</div><div className="k">removed (delisted)</div></div>
        <div className="card"><div className="n">{unverified}</div><div className="k">current-unverified</div></div>
      </div>

      <p className="lead" style={{ marginTop: -4 }}>
        Five views: the vessel table below, a <Link href="/map">map</Link> (flag vs. listed-address
        geography and one reported voyage), a <Link href="/network">network</Link> (vessel → related
        company → authority), a <Link href="/trace">trace</Link> (one vessel end to end), and a{" "}
        <Link href="/risk">screening view</Link> of discrete, individually sourced signals (no composite
        score; missing data shown separately). {activeOfac} OFAC records and {activeUk} UK designation are
        verified active; {removed} OFAC records are confirmed removed; {unverified} records remain
        current-unverified.
      </p>

      <h2>Vessels</h2>
      <Legend />
      <table>
        <thead>
          <tr>
            <th>Vessel</th><th>IMO</th><th>Flag</th><th>Related company</th><th>Relation</th><th>Status</th><th>Trace</th>
          </tr>
        </thead>
        <tbody>
          {dataset.vessels.map((v) => {
            const rels = ownersOf(v.imo);
            const flag = v.flagCountryId ? countryById.get(v.flagCountryId)?.name
              : <span className="mono" style={{ color: "var(--muted)" }}>{v.flagStatus === "removed-from-source" ? "removed" : "—"}</span>;
            const st = vesselDisplayStatus(v.imo);
            const pillClass = st === "active" ? "binding" : st === "removed" ? "removed" : st === "research" ? "research" : "unverified";
            return (
              <tr key={v.imo}>
                <td>{v.name}</td>
                <td><span className="mono">{v.imo}</span></td>
                <td>{flag}</td>
                <td>{rels.length ? rels.map((r) => r.company.name).join(", ") : <span className="mono" style={{ color: "var(--muted)" }}>—</span>}</td>
                <td><span className="mono" style={{ color: "var(--muted)" }}>{rels.length ? rels.map((r) => ROLE_SHORT[r.link.role] ?? r.link.role).join(", ") : "—"}</span></td>
                <td>
                  <span className={`pill ${pillClass}`}>
                    <span className="dot" /> {STATUS_LABEL[st]}
                  </span>
                </td>
                <td><Link className="mono" href={`/trace?imo=${v.imo}`}>→ trace</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="note">
        Allocation gate: this is design + a local dataset + the explorer only. Nothing is published to
        the Geo graph until the contributor slot on the bounty is confirmed. See <span className="mono">ONTOLOGY.md</span>{" "}
        and <span className="mono">data/SOURCES.md</span>.
      </div>
    </main>
  );
}
