/**
 * fetch-uk-sanctions.ts
 * UK ships. Since 28 Jan 2026 the FCDO UK Sanctions List is the single official source (the OFSI
 * consolidated list is closed). OpenSanctions ingests it as `gb_fcdo_sanctions`; we pull the FtM
 * export and keep schema === 'Vessel'. UK vessel entries carry IMO + owner/operator text + flag.
 *
 * VERIFY the dataset path against https://www.opensanctions.org/datasets/gb_fcdo_sanctions/ .
 * Alternative primary source: the GOV.UK published list (CSV/ODT) at
 * https://www.gov.uk/government/publications/the-uk-sanctions-list .
 *
 * Output: scripts/.raw/uk.json
 * Run:    npx tsx scripts/fetch-uk-sanctions.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { Vessel } from "../src/lib/types";

const URL =
  process.env.UK_FTM_URL ??
  "https://data.opensanctions.org/datasets/latest/gb_fcdo_sanctions/entities.ftm.json";

type FtM = { id: string; schema: string; caption?: string; properties: Record<string, string[]> };
const first = (e: FtM, k: string) => e.properties[k]?.[0];

async function main() {
  console.log(`GET ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const vessels: Vessel[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as FtM;
    if (e.schema !== "Vessel") continue;
    const imo = first(e, "imoNumber");
    if (!imo) continue;
    vessels.push({
      id: imo,
      name: e.caption ?? first(e, "name") ?? imo,
      imo,
      mmsi: first(e, "mmsi") ?? null,
      vesselType: first(e, "type") ?? null,
      flagCountryId: first(e, "flag") ?? null,
      flagStatus: "unknown",
      grossTonnage: null,
      deadweight: null,
      yearBuilt: first(e, "buildDate") ? Number(first(e, "buildDate")!.slice(0, 4)) : null,
      callSign: first(e, "callSign") ?? null,
      aliases: e.properties["previousName"] ?? [],
      sourceUrl: "https://www.gov.uk/government/publications/the-uk-sanctions-list",
    });
  }

  fs.mkdirSync(path.dirname("scripts/.raw/x"), { recursive: true });
  fs.writeFileSync(
    "scripts/.raw/uk.json",
    JSON.stringify({ vessels, companies: [], ownership: [], designations: [] }, null, 2),
    "utf8",
  );
  console.log(`vessels=${vessels.length}`);
  console.log("wrote scripts/.raw/uk.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
