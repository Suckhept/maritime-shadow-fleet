"use client";
import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { buildNetwork } from "../lib/graph";
import EdgeDetails, { type EdgeData } from "./EdgeDetails";

export default function NetworkView() {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<EdgeData | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const { nodes, edges } = buildNetwork();
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
            "font-size": 9,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-max-width": "120px",
            "text-wrap": "ellipsis",
            width: 16,
            height: 16,
            "border-width": 1,
            "border-color": "#0b1220",
          } as any,
        },
        { selector: 'node[kind="vessel"]', style: { width: 24, height: 24, "font-size": 10 } as any },
        { selector: 'node[kind="authority"]', style: { width: 20, height: 20, shape: "diamond" } as any },
        { selector: 'node[kind="company"]', style: { shape: "round-rectangle" } as any },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "data(color)",
            "line-opacity": 0.65,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "data(color)",
            "arrow-scale": 0.7,
            label: "data(label)",
            "font-family": "ui-monospace, monospace",
            "font-size": 7,
            color: "#8a95a8",
            "text-rotation": "autorotate",
            "text-background-color": "#0b1220",
            "text-background-opacity": 0.85,
            "text-background-padding": "2px",
          } as any,
        },
        { selector: "edge.sel", style: { width: 3, "line-opacity": 1, "z-index": 99 } as any },
      ],
      layout: { name: "cose", animate: false, padding: 30, nodeRepulsion: 9000, idealEdgeLength: 95 } as any,
      minZoom: 0.3,
      maxZoom: 2.5,
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
  }, []);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div ref={ref} className="cy" />
      <EdgeDetails edge={edge} onClose={() => setEdge(null)} />
    </div>
  );
}
