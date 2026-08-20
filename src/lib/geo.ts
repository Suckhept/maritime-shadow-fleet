import geoMap from "../../data/geo-entity-map.json";

const SPACE: string = (geoMap as any).spaceId;

type Section = "vessels" | "companies" | "authorities" | "programmes" | "countries";

function lookup(section: Section, key: string | undefined | null): string | null {
  if (!key) return null;
  const id = ((geoMap as any)[section] ?? {})[key];
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Canonical Geo entity page URL for a dataset entity, or null if not (yet) published. */
export function geoUrl(section: Section, key: string | undefined | null): string | null {
  const id = lookup(section, key);
  return id ? `https://www.geobrowser.io/space/${SPACE}/${id}` : null;
}

/** Resolve from a cytoscape node id (v:{imo}, c:{companyId}, a:{authorityId}, co:{countryId}). */
export function geoUrlForNodeId(nodeId: string): string | null {
  if (nodeId.startsWith("v:")) return geoUrl("vessels", nodeId.slice(2));
  if (nodeId.startsWith("c:")) return geoUrl("companies", nodeId.slice(2));
  if (nodeId.startsWith("a:")) return geoUrl("authorities", nodeId.slice(2));
  if (nodeId.startsWith("co:")) return geoUrl("countries", nodeId.slice(3));
  return null;
}
