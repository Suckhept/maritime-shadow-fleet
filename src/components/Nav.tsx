"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "overview" },
  { href: "/map", label: "map" },
  { href: "/network", label: "network" },
  { href: "/trace", label: "trace" },
  { href: "/risk", label: "risk" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <span className="brand">
        shadow-fleet<b>::</b>provenance
      </span>
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
