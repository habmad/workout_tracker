"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/", label: "Workouts" },
  { href: "/analytics", label: "Analytics" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Main">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "app-nav-link active" : "app-nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      <form action={logout} className="app-nav-logout">
        <button type="submit" className="app-nav-link app-nav-logout-btn">
          Lock
        </button>
      </form>
    </nav>
  );
}
