import type { Metadata } from "next";
import "../styles/globals.css";
import Nav from "../components/Nav";

export const metadata: Metadata = {
  title: "Maritime Shadow Fleet & Energy Provenance Map",
  description:
    "Trace how sanctioned oil moves through the world — from vessel to owner to destination.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
