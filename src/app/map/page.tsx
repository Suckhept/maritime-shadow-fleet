"use client";
import dynamic from "next/dynamic";
import Legend from "../../components/Legend";

const MapView = dynamic(() => import("../../components/MapView"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "var(--muted)" }}>loading map…</div>,
});

export default function MapPage() {
  return (
    <main className="wrap">
      <div className="eyebrow">Map view</div>
      <h1>Flag state vs. listed address country</h1>
      <p className="lead">
        Each arc connects a tanker&apos;s flag state to the <strong>listed address country</strong> of a
        related company &mdash; the country of the address that appears on the sanctions listing. This is
        informational geography: a listed address is <em>not</em> a jurisdiction of incorporation, a
        beneficial owner, or a place of control. Green arcs are documented voyages between real ports;
        points mark flag states, listed-address countries and reference oil ports.
      </p>
      <Legend voyage />
      <div className="viewport">
        <MapView />
      </div>
      <div className="note">
        One documented voyage is drawn in green (Viktor Bakaev, Primorsk → Zhoushan, July 2024), reported
        by Brookings as secondary analysis at month-level resolution &mdash; not an AIS-confirmed track.
        Dense position history is out of scope: a forward AIS collector ships in the repo
        (<span className="mono">scripts/collect-ais.ts</span>) but is not wired into this view. Absence of
        a track is not evidence of anything; it is simply uncollected.
      </div>
    </main>
  );
}
