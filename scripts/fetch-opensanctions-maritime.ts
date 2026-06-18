/**
 * fetch-opensanctions-maritime.ts
 * Primary structured collector. OpenSanctions consolidates OFAC + EU + UK + more and exposes a
 * FollowTheMoney (FtM) entity graph, so vessels, their owners (Ownership edges) and their
 * sanction listings (Sanction edges) come pre-linked.
 *
 * Free for non-commercial use. For a public Geo dataset, confirm licensing / use the API trial.
 * VERIFY the dataset URL against https://www.opensanctions.org/datasets/ before first run —
 * the sanctions collection FtM export path is the right source; the maritime collection is narrower.
 *
 * Output: scripts/.raw/opensanctions.json  ({ vessels, companies, ownership, designations })
 * Run:    npx tsx scripts/fetch-opensanctions-maritime.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { Vessel, Company, OwnershipLink, Designation } from "../src/lib/types";

// Newline-delimited FtM JSON for the consolidated sanctions collection. Confirm current path.
const URL =
  process.env.OS_FTM_URL ??
  "https://data.opensanctions.org/datasets/latest/sanctions/entities.ftm.json";

type FtM = {
  id: string;
  schema: string;
  caption?: string;
  properties: Record<string, (string | { id: string })[]>;
};

const first = (e: FtM, k: string): string | undefined => {
  const v = e.properties[k]?.[0];
  return typeof v === "string" ? v : v?.id;
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  console.log(`GET ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const byId = new Map<string, FtM>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as FtM;
    byId.set(e.id, e);
  }

  const vessels: Vessel[] = [];
  const companies = new Map<string, Company>();
  const ownership: OwnershipLink[] = [];
  const designations: Designation[] = [];

  for (const e of byId.values()) {
    if (e.schema !== "Vessel") continue;
    const imo = first(e, "imoNumber");
    if (!imo) continue; // anchor only on IMO
    vessels.push({
      id: imo,
      name: e.caption ?? first(e, "name") ?? imo,
      imo,
      mmsi: first(e, "mmsi") ?? null,
      vesselType: first(e, "type") ?? null,
      flagCountryId: first(e, "flag") ?? null, // ISO code; map to Country in normalize/manual QA
      flagStatus: "unknown",
      grossTonnage: null,
      deadweight: null,
      yearBuilt: first(e, "buildDate") ? Number(first(e, "buildDate")!.slice(0, 4)) : null,
      callSign: first(e, "callSign") ?? null,
      aliases: (e.properties["previousName"] as string[] | undefined) ?? [],
      sourceUrl: `https://www.opensanctions.org/entities/${e.id}/`,
    });
  }

  // Ownership edges link an owner entity to an asset (the vessel).
  for (const e of byId.values()) {
    if (e.schema !== "Ownership") continue;
    const ownerId = first(e, "owner");
    const assetId = first(e, "asset");
    if (!ownerId || !assetId) continue;
    const owner = byId.get(ownerId);
    const asset = byId.get(assetId);
    if (!owner || !asset || asset.schema !== "Vessel") continue;
    const imo = first(asset, "imoNumber");
    if (!imo) continue;
    const cid = slug(owner.caption ?? ownerId);
    if (!companies.has(cid)) {
      companies.set(cid, {
        id: cid,
        name: owner.caption ?? ownerId,
        imoCompanyNumber: first(owner, "imoNumber") ?? null,
        jurisdiction: null,
        describedAsBasedIn: first(owner, "jurisdiction") ?? null,
        addressCountryId: first(owner, "country") ?? null,
        registeredAddress: first(owner, "address") ?? null,
        taxId: null,
        registrationNumber: null,
        lei: first(owner, "leiCode") ?? null,
        sourceUrl: `https://www.opensanctions.org/entities/${owner.id}/`,
      });
    }
    const osUrl = `https://www.opensanctions.org/entities/${e.id}/`;
    ownership.push({
      vesselImo: imo,
      companyId: cid,
      role: "linkedTo",
      confidence: "unconfirmed",
      listingSourceUrl: osUrl,
      predicateEvidenceUrl: osUrl,
      evidenceQuote: "OpenSanctions aggregator record — predicate not yet confirmed against a primary source.",
      evidenceDate: null,
      note: "OpenSanctions is an aggregator; relation predicate and registered ownership must be confirmed against a primary source before promotion.",
    });
  }

  fs.mkdirSync(path.dirname("scripts/.raw/x"), { recursive: true });
  fs.writeFileSync(
    "scripts/.raw/opensanctions.json",
    JSON.stringify({ vessels, companies: [...companies.values()], ownership, designations }, null, 2),
    "utf8",
  );
  console.log(`vessels=${vessels.length} companies=${companies.size} ownership=${ownership.length}`);
  console.log("wrote scripts/.raw/opensanctions.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
