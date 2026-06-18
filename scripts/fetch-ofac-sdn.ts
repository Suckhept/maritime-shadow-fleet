/**
 * fetch-ofac-sdn.ts
 * Raw primary-source collector for OFAC. The SDN Advanced XML carries vessels as features with
 * IMO + MMSI and "Linked To" relationships to their owning entities.
 *
 * VERIFY the export URL against https://ofac.treasury.gov/sanctions-list-service (the Sanctions
 * List Service publishes SDN_ADVANCED.XML). The SDN Advanced schema is large; this extracts the
 * vessel slice and is intended for cross-checking the OpenSanctions output against the primary source.
 *
 * Deps:  npm i fast-xml-parser
 * Output: scripts/.raw/ofac.json  ({ vessels, companies, ownership, designations })
 * Run:    npx tsx scripts/fetch-ofac-sdn.ts
 */
import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { Vessel } from "../src/lib/types";

const URL =
  process.env.OFAC_SDN_ADVANCED_URL ??
  "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN_ADVANCED.XML";

async function main() {
  console.log(`GET ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);

  // NOTE: SDN Advanced nests entities under sanctionsData. The exact path varies by release —
  // inspect `doc` once and adjust selectors. Below is the documented shape (DistinctParty ->
  // Profile -> Identity -> features). Vessel IMO/MMSI live in feature values; ownership is in
  // ProfileRelationships ("Linked To"). Treat this as a starting selector, validated on first run.
  const parties =
    doc?.sanctionsData?.distinctParties?.distinctParty ??
    doc?.Sanctions?.DistinctParties?.DistinctParty ??
    [];

  const vessels: Vessel[] = [];
  const list = Array.isArray(parties) ? parties : [parties];
  for (const p of list) {
    const json = JSON.stringify(p);
    if (!/vessel/i.test(json)) continue;
    const imo = json.match(/IMO\s*[:#]?\s*(\d{7})/i)?.[1];
    if (!imo) continue;
    const mmsi = json.match(/MMSI\s*[:#]?\s*(\d{9})/i)?.[1] ?? null;
    vessels.push({
      id: imo,
      name: String(p?.Profile?.Identity?.Alias?.[0]?.DocumentedName ?? imo),
      imo,
      mmsi,
      vesselType: null,
      flagCountryId: null,
      flagStatus: "unknown",
      grossTonnage: null,
      deadweight: null,
      yearBuilt: null,
      callSign: null,
      aliases: [],
      sourceUrl: "https://ofac.treasury.gov/sanctions-list-service",
    });
  }

  fs.mkdirSync(path.dirname("scripts/.raw/x"), { recursive: true });
  fs.writeFileSync(
    "scripts/.raw/ofac.json",
    JSON.stringify({ vessels, companies: [], ownership: [], designations: [] }, null, 2),
    "utf8",
  );
  console.log(`vessels=${vessels.length} (validate the XML selectors against the live export)`);
  console.log("wrote scripts/.raw/ofac.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
