/**
 * parse-kse-core.ts
 * The KSE Institute "Core of Russia's Shadow Fleet" report is the highest-signal documented subset
 * (named tankers, flags, insurers). It is published as a PDF, so extraction is best-effort: this
 * pulls IMO + nearby vessel name and emits candidates for MANUAL QA — never trust it blindly.
 *
 * 1. Download the report from https://kse.ua/ (Russian Shadow Fleet Tracker) to data/kse-core.pdf
 * 2. Deps: npm i pdf-parse
 * 3. Run:  npx tsx scripts/parse-kse-core.ts data/kse-core.pdf
 *
 * Output: scripts/.raw/kse.json — vessels carry a research-designation, NOT a binding sanction.
 */
import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import type { Vessel, Designation } from "../src/lib/types";

const PDF = process.argv[2] ?? "data/kse-core.pdf";

async function main() {
  if (!fs.existsSync(PDF)) {
    console.error(`Missing ${PDF}. Download the KSE report first (see header).`);
    process.exit(1);
  }
  const { text } = await pdf(fs.readFileSync(PDF));

  // IMO numbers are 7 digits. Capture the IMO and the token sequence on the same line as a name hint.
  const lines = text.split("\n");
  const seen = new Set<string>();
  const vessels: Vessel[] = [];
  const designations: Designation[] = [];

  for (const line of lines) {
    const m = line.match(/\b(\d{7})\b/);
    if (!m) continue;
    const imo = m[1];
    if (seen.has(imo)) continue;
    seen.add(imo);
    const nameGuess = line
      .replace(/\b\d{7}\b/, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .split(/\s{2,}|\t/)[0]
      ?.slice(0, 60) || imo;

    vessels.push({
      id: imo, name: nameGuess, imo, mmsi: null, vesselType: null,
      flagCountryId: null, flagStatus: "unknown", grossTonnage: null, deadweight: null, yearBuilt: null,
      callSign: null, aliases: [],
      sourceUrl: "https://kse.ua/",
    });
    designations.push({
      id: `d-kse-${imo}`, appliesToType: "vessel", appliesToId: imo,
      listName: "KSE Core of Russia's Shadow Fleet", nature: "research-designation",
      program: null, designationDate: null, currentStatus: "current-unverified", statusVerifiedAt: null,
      statusSource: null, dateRemoved: null, authorityId: "kse-institute", uniqueId: null,
      statementOfReasons: null, sourceUrl: "https://kse.ua/",
    });
  }

  fs.mkdirSync(path.dirname("scripts/.raw/x"), { recursive: true });
  fs.writeFileSync(
    "scripts/.raw/kse.json",
    JSON.stringify({ vessels, companies: [], ownership: [], designations }, null, 2),
    "utf8",
  );
  console.log(`candidates=${vessels.length} — REVIEW scripts/.raw/kse.json by hand before merging.`);
  console.log("wrote scripts/.raw/kse.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
