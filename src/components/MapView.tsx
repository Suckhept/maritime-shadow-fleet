"use client";
import { useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { ArcLayer, ScatterplotLayer, TextLayer, BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { buildArcs, buildPoints, buildVoyages } from "../lib/mapdata";

const INITIAL_VIEW_STATE = {
  longitude: 30,
  latitude: 38,
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
};

export default function MapView() {
  const arcs = useMemo(() => buildArcs(), []);
  const points = useMemo(() => buildPoints(), []);
  const voyages = useMemo(() => buildVoyages(), []);

  const basemap = new TileLayer({
    id: "basemap",
    data: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props: any) => {
      const { boundingBox } = props.tile;
      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
      });
    },
  });

  const arcLayer = new ArcLayer({
    id: "flag-to-owner",
    data: arcs,
    getSourcePosition: (d: any) => d.from,
    getTargetPosition: (d: any) => d.to,
    getSourceColor: (d: any) => d.color,
    getTargetColor: (d: any) => [93, 202, 165],
    getWidth: 1.6,
    getHeight: 0.35,
    greatCircle: true,
    pickable: true,
  });

  const voyageLayer = new ArcLayer({
    id: "documented-voyages",
    data: voyages,
    getSourcePosition: (d: any) => d.from,
    getTargetPosition: (d: any) => d.to,
    getSourceColor: [29, 158, 117],
    getTargetColor: [157, 226, 200],
    getWidth: 3,
    getHeight: 0.5,
    greatCircle: true,
    pickable: true,
  });

  const pointLayer = new ScatterplotLayer({
    id: "entities",
    data: points,
    getPosition: (d: any) => d.position,
    getFillColor: (d: any) => d.color,
    getRadius: (d: any) => (d.kind === "port" ? 6 : 7),
    radiusUnits: "pixels",
    radiusMinPixels: 4,
    stroked: true,
    getLineColor: [11, 18, 32],
    lineWidthMinPixels: 1,
    pickable: true,
  });

  const labelLayer = new TextLayer({
    id: "labels",
    data: points,
    getPosition: (d: any) => d.position,
    getText: (d: any) => d.name,
    getSize: 11,
    getColor: [230, 234, 240, 200],
    getPixelOffset: [0, -14],
    fontFamily: "ui-monospace, monospace",
    sizeUnits: "pixels",
    background: true,
    getBackgroundColor: [11, 18, 32, 180],
    backgroundPadding: [3, 2],
  });

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={[basemap, arcLayer, voyageLayer, pointLayer, labelLayer]}
      getTooltip={({ object }: any) =>
        object &&
        (object.sourceUrl && object.vesselName
          ? { html: `<div class="tooltip">${object.vesselName} · reported voyage<br/>${object.fromName} → ${object.toName}</div>` }
          : object.vesselName
            ? {
                html: `<div class="tooltip">${object.vesselName} · IMO ${object.imo}<br/>flag: ${object.fromName} → ${object.companyName} <span style="opacity:.7">(${object.predicates.join(", ")}; listed-address country: ${object.toName})</span>${object.statusLabel ? `<br/>status: ${object.statusLabel}` : ""}</div>`,
              }
            : object.name
              ? { html: `<div class="tooltip">${object.name} · ${object.kind}${object.kind === "port" ? '<br/><span style="opacity:.7">approximate coordinate (city/area centroid, secondary source)</span>' : ""}</div>` }
              : null)
      }
      style={{ position: "absolute", inset: "0" }}
    />
  );
}
