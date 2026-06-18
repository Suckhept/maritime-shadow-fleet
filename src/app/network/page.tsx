"use client";
import dynamic from "next/dynamic";
import Legend from "../../components/Legend";

const NetworkView = dynamic(() => import("../../components/NetworkView"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "var(--muted)" }}>loading graph…</div>,
});

export default function NetworkPage() {
  return (
    <main className="wrap">
      <div className="eyebrow">Network view</div>
      <h1>Vessel → related company → designation</h1>
      <p className="lead">
        The full graph: every tanker links to a <strong>related company</strong> (the edge label is the
        exact predicate &mdash; registered owner, beneficial owner, OFAC property interest, owner /
        operator, or a bare &ldquo;linked to&rdquo;) and to the authority that listed it. Node and edge
        colour follow the same lifecycle status as the map (shared <code>designationPresentation</code>):
        <strong>red</strong> = verified active designation, <strong>grey</strong> = removed designation,
        <strong>amber</strong> = current status unverified; research markers are shown separately. Drag to
        explore; <strong>click any edge</strong> for its predicate, evidence quote, source and confidence.
      </p>
      <Legend kinds />
      <div className="viewport">
        <NetworkView />
      </div>
    </main>
  );
}
