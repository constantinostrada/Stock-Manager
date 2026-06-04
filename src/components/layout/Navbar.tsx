"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package2 } from "lucide-react";
import { NavbarSearch } from "@/components/layout/NavbarSearch";

type LinkId = "inventory" | "trash" | "alerts" | "reports";

const navLinks: Array<{
  href: string;
  label: string;
  id?: LinkId;
  /** Route prefix used for active matching when it differs from href (e.g. the whole /reports section). */
  match?: string;
}> = [
  { href: "/", label: "Dashboard" },
  { href: "/dashboard", label: "Inventario", id: "inventory" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock Levels" },
  { href: "/stock/movements", label: "Movements" },
  { href: "/reports/valuation", label: "Reports", id: "reports", match: "/reports" },
  { href: "/products/trash", label: "Papelera", id: "trash" },
  { href: "/alerts", label: "Alertas", id: "alerts" },
];

function matchesRoute(pathname: string, matchPath: string): boolean {
  if (matchPath === "/") return pathname === "/";
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

/**
 * Returns the href of the active nav link for the current pathname.
 * The longest matching prefix wins so nested sections (e.g. /products/trash)
 * take precedence over their parent (/products).
 */
function getActiveHref(pathname: string): string | undefined {
  let active: { href: string; matchLength: number } | undefined;
  for (const link of navLinks) {
    const matchPath = link.match ?? link.href;
    if (!matchesRoute(pathname, matchPath)) continue;
    if (!active || matchPath.length > active.matchLength) {
      active = { href: link.href, matchLength: matchPath.length };
    }
  }
  return active?.href;
}

interface NavbarProps {
  /** Count of products currently below LOW_STOCK_THRESHOLD. When > 0, the Alertas link shows a red dot. */
  lowStockCount?: number;
  /** Count of soft-deleted products. When > 0, the Papelera link shows a neutral numeric badge. */
  deletedCount?: number;
}

export function Navbar({
  lowStockCount = 0,
  deletedCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const hasAlerts = lowStockCount > 0;
  const hasDeleted = deletedCount > 0;
  return (
    <header className="border-b bg-background" data-testid="app-header">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package2 className="text-primary h-5 w-5" />
          <span>Stock Manager</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.href === activeHref;
              const isAlerts = link.id === "alerts";
              const isInventory = link.id === "inventory";
              const isTrash = link.id === "trash";
              const isReports = link.id === "reports";
              const testId = isAlerts
                ? "nav-link-alerts"
                : isInventory
                  ? "nav-link-inventory"
                  : isTrash
                    ? "nav-link-trash"
                    : isReports
                      ? "nav-link-reports"
                      : undefined;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  data-testid={testId}
                  data-has-alerts={isAlerts ? (hasAlerts ? "true" : "false") : undefined}
                  data-has-deleted={isTrash ? (hasDeleted ? "true" : "false") : undefined}
                  aria-label={
                    isAlerts && hasAlerts
                      ? `Alertas (${lowStockCount} con bajo stock)`
                      : isTrash && hasDeleted
                        ? `Papelera (${deletedCount} eliminado${
                            deletedCount === 1 ? "" : "s"
                          })`
                        : undefined
                  }
                >
                  {link.label}
                  {isAlerts && hasAlerts ? (
                    <span
                      aria-hidden="true"
                      data-testid="nav-alerts-dot"
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600"
                    />
                  ) : null}
                  {isTrash && hasDeleted ? (
                    <span
                      data-testid="nav-trash-badge"
                      className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted-foreground/20 px-1 text-xs font-medium text-foreground"
                    >
                      {deletedCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <NavbarSearch />
        </div>
      </div>
    </header>
  );
}
