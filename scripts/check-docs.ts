// Prose contradiction linter. qa.ts validates JSON/CSV; this guards the hand-written prose in
// README / DEMO / SOURCES against known stale/contradictory phrasings and against drift from the seed.
import fs from "fs";
import path from "path";
import type { Designation, OwnershipLink } from "../src/lib/types";

const read = (p: string) => fs.readFileSync(p, "utf8");
const SEED = path.join(__dirname, "..", "data", "seed");
const desig = JSON.parse(read(path.join(SEED, "designations.json"))) as Designation[];
const ownership = JSON.parse(read(path.join(SEED, "ownership.json"))) as OwnershipLink[];

const docs: Record<string, string> = {
  "README.md": read(path.join(__dirname, "..", "README.md")),
  "DEMO.md": read(path.join(__dirname, "..", "DEMO.md")),
  "data/SOURCES.md": read(path.join(__dirname, "..", "data", "SOURCES.md")),
};

const errors: string[] = [];

// 1) Denylist of stale/contradictory phrasings that must never reappear.
const deny: { re: RegExp; why: string }[] = [
  { re: /Russia-only/i, why: 'scope is no longer "Russia-only" (Venezuela hull present)' },
  { re: /30 active/i, why: 'stale active count (use the generated STATS block)' },
  { re: /30 records confirmed/i, why: 'stale OFAC verification count' },
  { re: /flagCountryId = null/i, why: 'Lunar Tide flag is Guinea, not null' },
  { re: /no country inferred/i, why: 'Lunar Tide flag is Guinea (OFAC)' },
  { re: /keeps `?current-unverified/i, why: 'Winky is now active; no record is current-unverified' },
  { re: /both OFAC records were live-verified/i, why: 'stale DEMO phrasing' },
];
for (const [file, text] of Object.entries(docs)) {
  for (const d of deny) if (d.re.test(text)) errors.push(`${file}: forbidden phrase /${d.re.source}/ — ${d.why}`);
}

// 2) README must carry the generated STATS block.
if (!/STATS:BEGIN[\s\S]*STATS:END/.test(docs["README.md"])) errors.push("README.md: STATS block missing");

// 3) Dynamic cross-check against the seed: the active-OFAC count in the STATS block must match.
const activeOfac = desig.filter((d) => d.currentStatus === "active" && d.authorityId === "ofac").length;
const activeUk = desig.filter((d) => d.currentStatus === "active" && d.authorityId !== "ofac").length;
const unver = desig.filter((d) => d.currentStatus === "current-unverified").length;
const statsMatch = docs["README.md"].match(/(\d+) active \(OFAC\) \+ (\d+) active \(UK\)/);
if (!statsMatch) errors.push("README.md: could not find generated active-count line");
else {
  if (Number(statsMatch[1]) !== activeOfac) errors.push(`README STATS active-OFAC ${statsMatch[1]} != seed ${activeOfac}`);
  if (Number(statsMatch[2]) !== activeUk) errors.push(`README STATS active-UK ${statsMatch[2]} != seed ${activeUk}`);
}
// 4) If no record is current-unverified, the docs must not claim one in a counting context.
if (unver === 0) {
  for (const [file, text] of Object.entries(docs)) {
    if (/current-unverified designation records/.test(text) && !/0 current-unverified/.test(text))
      errors.push(`${file}: claims a current-unverified record but seed has none`);
  }
}
// 5) The dual-listing predicate evidence must point at sb0348 in the data (not Recent Actions).
const rosalindRels = ownership.filter((o) => o.vesselImo === "9277735" && o.companyId === "winky-international-limited");
if (!rosalindRels.some((o) => o.role === "registeredOwner")) errors.push("ownership: Rosalind→Winky registeredOwner relation missing");
if (rosalindRels.some((o) => /recent-actions\/20251231/.test(o.predicateEvidenceUrl))) errors.push("ownership: Rosalind→Winky predicate evidence still points at Recent Actions, not sb0348");

if (errors.length) {
  console.error("DOC CHECK FAILED:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("DOC CHECK PASS — no stale/contradictory prose; STATS block matches seed.");
