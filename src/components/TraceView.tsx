"use client";
import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { buildTrace } from "../lib/graph";
import EdgeDetails, { type EdgeData } from "./EdgeDetails";
import { geoUrlForNodeId } from "../lib/geo";

export default function TraceView({ imo }: { imo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<EdgeData | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const { nodes, edges } = buildTrace(imo);
    const cy = cytoscape({
      container: ref.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            color: "#e6eaf0",
            "font-family": "ui-monospace, monospace",
            "font-size": 10,
            "text-valign": "bottom",
            "text-margin-y": 5,
            "text-max-width": "140px",
            "text-wrap": "ellipsis",
            width: 18,
            height: 18,
            "border-width": 1,
            "border-color": "#0b1220",
          } as any,
        },
        { selector: 'node[kind="vessel"]', style: { width: 30, height: 30, "font-size": 12 } as any },
        { selector: 'node[kind="authority"]', style: { shape: "diamond", width: 22, height: 22 } as any },
        { selector: 'node[kind="company"]', style: { shape: "round-rectangle" } as any },
        { selector: 'node[kind="country"]', style: { shape: "hexagon" } as any },
        { selector: 'node[kind="port"]', style: { shape: "ellipse", width: 16, height: 16 } as any },
        {
          selector: "edge",
          style: {
            width: 1.2,
            "line-color": "data(color)",
            "line-opacity": 0.75,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "data(color)",
            "arrow-scale": 0.8,
            label: "data(label)",
            "font-family": "ui-monospace, monospace",
            "font-size": 8,
            color: "#aeb6c6",
            "text-rotation": "autorotate",
            "text-background-color": "#0b1220",
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
          } as any,
        },
        { selector: "edge.sel", style: { width: 3.2, "line-opacity": 1, "z-index": 99 } as any },
      ],
      layout: { name: "cose", animate: false, padding: 40, nodeRepulsion: 12000, idealEdgeLength: 120 } as any,
      minZoom: 0.4,
      maxZoom: 2.5,
    });

    cy.on("tap", "node", (evt) => {
      const g = geoUrlForNodeId(evt.target.id());
      if (g) window.open(g, "_blank", "noopener");
    });
    cy.on("tap", "edge", (evt) => {
      cy.edges().removeClass("sel");
      evt.target.addClass("sel");
      setEdge(evt.target.data() as EdgeData);
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) { cy.edges().removeClass("sel"); setEdge(null); }
    });

    return () => cy.destroy();
  }, [imo]);

  useEffect(() => setEdge(null), [imo]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div ref={ref} className="cy" />
      <EdgeDetails edge={edge} onClose={() => setEdge(null)} />
    </div>
  );
}
