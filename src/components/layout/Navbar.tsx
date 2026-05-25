import Link from "next/link";
import { Package2 } from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock Levels" },
  { href: "/stock/movements", label: "Movements" },
];

export function Navbar() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Package2 className="text-primary h-5 w-5" />
          <span>Stock Manager</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
