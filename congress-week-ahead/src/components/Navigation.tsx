"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Week Ahead" },
  { href: "/house", label: "House" },
  { href: "/senate", label: "Senate" },
  { href: "/search", label: "Search" },
  { href: "/sources", label: "Sources" },
  { href: "/settings", label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="bg-civic-navy text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-civic-navy font-bold text-sm">CWA</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Congress Week Ahead</h1>
              <p className="text-xs text-slate-300 leading-tight hidden sm:block">
                Official Congressional Schedule Tracker
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.slice(0, 4).map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
