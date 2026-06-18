export default function Legend({ kinds = false, voyage = false }: { kinds?: boolean; voyage?: boolean }) {
  return (
    <div className="legend">
      <span><i style={{ background: "var(--binding)" }} /> active sanction (status verified)</span>
      <span><i style={{ background: "var(--unverified)" }} /> listed — current status unverified</span>
      <span><i style={{ background: "var(--removed)" }} /> removed (delisted)</span>
      <span><i style={{ background: "var(--research)" }} /> research designation</span>
      {voyage && (
        <>
          <span><i style={{ background: "var(--port)" }} /> oil port · reported voyage</span>
        </>
      )}
      {kinds && (
        <>
          <span><i style={{ background: "var(--vessel)" }} /> vessel (no designation)</span>
          <span><i style={{ background: "var(--company)" }} /> company</span>
          <span><i style={{ background: "var(--authority)" }} /> authority</span>
          <span><i style={{ background: "var(--country)" }} /> country</span>
        </>
      )}
    </div>
  );
}
