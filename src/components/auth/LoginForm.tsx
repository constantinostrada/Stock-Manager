"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * LoginForm — manager login screen (frontend only).
 *
 * Presentation component: validates the fields client-side and exposes the
 * submit hook point. There is NO backend wired yet — submission only runs
 * the local validation and surfaces a "pending integration" notice.
 *
 * LAYER: interfaces (presentation component)
 */

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "El email es obligatorio";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Ingresá un email válido";
    }
    if (!password) {
      next.password = "La contraseña es obligatoria";
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // TODO: wire to the authentication use case when the backend exists.
    setNotice("Autenticación pendiente de integración con el backend.");
  }

  return (
    <Card className="w-full max-w-md" data-testid="login-card">
      <CardHeader className="items-center text-center">
        <div className="bg-primary/10 text-primary mb-2 flex h-12 w-12 items-center justify-center rounded-full">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">Acceso de managers</CardTitle>
        <CardDescription>Ingresá tus credenciales para administrar el inventario</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {notice && (
            <div
              className="bg-muted text-muted-foreground rounded-md p-3 text-sm"
              role="status"
              data-testid="login-notice"
            >
              {notice}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="manager@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className="text-destructive text-sm" data-testid="email-error">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-destructive text-sm" data-testid="password-error">
                {errors.password}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full">
            Iniciar sesión
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
