import Link from "next/link";
import { Package2 } from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock Levels" },
  { href: "/stock/movements", label: "Movements" },
  { href: "/alerts", label: "Alertas", id: "alerts" as const },
];

interface NavbarProps {
  /** Count of products currently below LOW_STOCK_THRESHOLD. When > 0, the Alertas link shows a red dot. */
  lowStockCount?: number;
}

export function Navbar({ lowStockCount = 0 }: NavbarProps) {
  const hasAlerts = lowStockCount > 0;
  return (
    <header className="border-b bg-background" data-testid="app-header">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package2 className="text-primary h-5 w-5" />
          <span>Stock Manager</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isAlerts = link.id === "alerts";
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                data-testid={isAlerts ? "nav-link-alerts" : undefined}
                data-has-alerts={isAlerts ? (hasAlerts ? "true" : "false") : undefined}
                aria-label={
                  isAlerts && hasAlerts
                    ? `Alertas (${lowStockCount} con bajo stock)`
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
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
