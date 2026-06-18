/**
 * derive-portcalls.ts — turn captured AIS positions into PortCall candidates.
 *
 * Closes the pipeline gap: collect-ais.ts writes raw positions; this groups them by vessel,
 * detects when a vessel sits within a port's radius long enough to count as a call, and emits
 * candidate PortCall rows. Output is written to data/derived/ as *candidates* — review and
 * confirm before promoting into data/seed/portcalls.json.
 *
 * Input : scripts/.raw/ais-positions.ndjson   (one JSON object per line:
 *           { "mmsi": "636014308", "lat": 59.7, "lon": 28.3, "ts": "2026-06-10T12:00:00Z" })
 * Refs  : data/seed/ports.json, data/seed/vessels.json
 * Output: data/derived/portcalls.candidates.json
 *
 * Run:  npx tsx scripts/derive-portcalls.ts [radiusKm=25] [minDwellHours=2]
 */
import fs from "node:fs";
import path from "node:path";
import type { Port, Vessel, PortCall } from "../src/lib/types";

const RADIUS_KM = Number(process.argv[2] ?? 25);
const MIN_DWELL_H = Number(process.argv[3] ?? 2);
const IN = "scripts/.raw/ais-positions.ndjson";
const OUT_DIR = "data/derived";
const OUT = path.join(OUT_DIR, "portcalls.candidates.json");
const AIS_SOURCE = "https://aisstream.io/";

const ports = JSON.parse(fs.readFileSync("data/seed/ports.json", "utf8")) as Port[];
const vessels = JSON.parse(fs.readFileSync("data/seed/vessels.json", "utf8")) as Vessel[];
const mmsiToImo = new Map<string, string>();
for (const v of vessels) if (v.mmsi) mmsiToImo.set(v.mmsi, v.imo);

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function nearestPort(lat: number, lon: number): Port | null {
  let best: Port | null = null;
  let bestD = Infinity;
  for (const p of ports) {
    if (p.lat == null || p.lon == null) continue;
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best && bestD <= RADIUS_KM ? best : null;
}

interface Pos { mmsi: string; lat: number; lon: number; ts: string }

if (!fs.existsSync(IN)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, "[]\n", "utf8");
  console.log(`No AIS capture at ${IN}. Run scripts/collect-ais.ts first. Wrote empty ${OUT}.`);
  process.exit(0);
}

const byVessel = new Map<string, Pos[]>();
let lines = 0;
for (const raw of fs.readFileSync(IN, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line) continue;
  lines++;
  let o: any;
  try { o = JSON.parse(line); } catch { continue; }
  const mmsi = String(o.mmsi ?? o.MMSI ?? "");
  const lat = Number(o.lat ?? o.latitude ?? o.Latitude);
  const lon = Number(o.lon ?? o.longitude ?? o.Longitude);
  const ts = String(o.ts ?? o.timestamp ?? o.time ?? "");
  if (!mmsi || Number.isNaN(lat) || Number.isNaN(lon)) continue;
  const arr = byVessel.get(mmsi) ?? [];
  arr.push({ mmsi, lat, lon, ts });
  byVessel.set(mmsi, arr);
}

const candidates: PortCall[] = [];
for (const [mmsi, posList] of byVessel) {
  const imo = mmsiToImo.get(mmsi);
  if (!imo) continue; // only positions for vessels in the dataset
  posList.sort((a, b) => a.ts.localeCompare(b.ts));

  let run: { port: Port; first: string; last: string } | null = null;
  const flush = () => {
    if (!run) return;
    const dwellH =
      run.first && run.last ? (Date.parse(run.last) - Date.parse(run.first)) / 3.6e6 : 0;
    if (dwellH >= MIN_DWELL_H || (!run.first && !run.last)) {
      candidates.push({
        id: `pc-${imo}-${run.port.id}-${run.first || candidates.length}`,
        vesselImo: imo,
        portId: run.port.id,
        arrival: run.first || null,
        departure: run.last || null,
        observationMethod: "ais-derived",
        sourceUrl: AIS_SOURCE,
      });
    }
    run = null;
  };

  for (const p of posList) {
    const port = nearestPort(p.lat, p.lon);
    if (port && run && port.id === run.port.id) {
      run.last = p.ts || run.last;
    } else {
      flush();
      if (port) run = { port, first: p.ts, last: p.ts };
    }
  }
  flush();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(candidates, null, 2) + "\n", "utf8");
console.log(
  `Parsed ${lines} positions for ${byVessel.size} MMSIs (${[...byVessel.keys()].filter((m) => mmsiToImo.has(m)).length} in dataset). ` +
  `Derived ${candidates.length} port-call candidate(s) at radius ${RADIUS_KM}km / dwell ${MIN_DWELL_H}h -> ${OUT}.`
);
