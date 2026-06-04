import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/Navbar";
import { getLowStockProducts } from "@interfaces/actions/alertsActions";
import { getDeletedProductCount } from "@interfaces/actions/productActions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Manager",
  description: "Production-ready inventory and stock management system.",
};

// Runs before paint so the correct theme class is on <html> from the first frame.
// Explicit choice in localStorage wins; otherwise follow the OS preference.
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [lowStockProducts, deletedCount] = await Promise.all([
    getLowStockProducts(),
    getDeletedProductCount(),
  ]);
  const lowStockCount = lowStockProducts.length;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <Navbar lowStockCount={lowStockCount} deletedCount={deletedCount} />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
