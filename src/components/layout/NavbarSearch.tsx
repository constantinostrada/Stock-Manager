"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function NavbarSearch() {
  const router = useRouter();
  const [value, setValue] = useState<string>("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      role="search"
      data-testid="navbar-search"
      onSubmit={handleSubmit}
      className="relative"
    >
      <input
        id="navbar-search-input"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar producto..."
        aria-label="Buscar producto"
        data-testid="navbar-search-input"
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-56 rounded-md border px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        data-testid="navbar-search-submit"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
