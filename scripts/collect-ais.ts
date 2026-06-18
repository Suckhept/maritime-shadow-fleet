/**
 * collect-ais.ts
 * Forward AIS collector. aisstream.io streams real-time positions over a WebSocket (no history API),
 * so this RUNS FORWARD: leave it running to accumulate positions for the seed vessels' MMSIs, then
 * derive port calls from dwell near known port coordinates.
 *
 * Reality check: shadow vessels spoof or disable AIS, so coverage is partial and gaps are themselves
 * a signal — model the absence, do not invent positions. Anchor on IMO; MMSI can be reassigned.
 *
 * 1. Free API key from https://aisstream.io/
 * 2. Deps: npm i ws
 * 3. Run:  AISSTREAM_KEY=xxx npx tsx scripts/collect-ais.ts
 *
 * Output: scripts/.raw/ais-positions.ndjson (one position per line; feed into a port-call deriver)
 */
import fs from "node:fs";
import WebSocket from "ws";
import vessels from "../data/seed/vessels.json";

const KEY = process.env.AISSTREAM_KEY;
if (!KEY) {
  console.error("Set AISSTREAM_KEY (free key from https://aisstream.io/).");
  process.exit(1);
}

const mmsis = (vessels as { mmsi: string | null }[])
  .map((v) => v.mmsi)
  .filter((m): m is string => Boolean(m));

if (mmsis.length === 0) {
  console.error("No MMSIs in seed yet — enrich vessels with MMSI first (e.g. via OpenSanctions).");
  process.exit(1);
}

const out = fs.createWriteStream("scripts/.raw/ais-positions.ndjson", { flags: "a" });
const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      APIKey: KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]], // whole world; narrow to a sea to cut volume
      FiltersShipMMSI: mmsis,
      FilterMessageTypes: ["PositionReport", "ShipStaticData"],
    }),
  );
  console.log(`subscribed to ${mmsis.length} MMSIs — collecting (Ctrl-C to stop)`);
});

ws.on("message", (buf: WebSocket.RawData) => {
  try {
    const msg = JSON.parse(buf.toString());
    const meta = msg.MetaData ?? {};
    const pr = msg.Message?.PositionReport;
    const record = {
      ts: meta.time_utc ?? new Date().toISOString(),
      mmsi: meta.MMSI,
      name: (meta.ShipName ?? "").trim(),
      lat: pr?.Latitude ?? meta.latitude,
      lon: pr?.Longitude ?? meta.longitude,
      type: msg.MessageType,
    };
    out.write(JSON.stringify(record) + "\n");
    process.stdout.write(".");
  } catch {
    /* ignore malformed frames */
  }
});

ws.on("error", (e) => console.error("ws error:", e));
ws.on("close", () => {
  out.end();
  console.log("\nstream closed.");
});
