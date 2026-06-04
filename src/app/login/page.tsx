/**
 * Login Page (/login)
 *
 * Manager login screen — frontend only. Renders the LoginForm presentation
 * component centered on the page; authentication is not wired yet.
 *
 * LAYER: interfaces (Next.js App Router page)
 */

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — Stock Manager",
  description: "Acceso para usuarios manager del sistema de inventario.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" data-testid="login-page">
      <LoginForm />
    </div>
  );
}
