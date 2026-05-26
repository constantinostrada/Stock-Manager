import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/Navbar";
import { getLowStockProducts } from "@interfaces/actions/alertsActions";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stock Manager",
  description: "Production-ready inventory and stock management system.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lowStockCount = (await getLowStockProducts()).length;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <Navbar lowStockCount={lowStockCount} />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
