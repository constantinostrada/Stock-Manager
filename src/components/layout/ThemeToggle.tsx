"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  // null until mounted so server and client render the same markup;
  // the real theme is applied to <html> by the inline script in the layout head.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  function handleToggle() {
    const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (private mode, etc.) — theme still toggles for this page view
    }
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle"
      className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
