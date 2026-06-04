/**
 * Tests for LoginForm — manager login screen (frontend only):
 *  - renders title, email + password fields and the submit button.
 *  - client-side validation: required fields and email format.
 *  - show/hide password toggle.
 *  - valid submit surfaces the "pending backend integration" notice
 *    (no server round-trip — the component is purely presentational).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  it("renders the heading, fields and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByText("Acceso de managers")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("shows required-field errors when submitting empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByTestId("email-error")).toHaveTextContent("El email es obligatorio");
    expect(screen.getByTestId("password-error")).toHaveTextContent("La contraseña es obligatoria");
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "no-es-un-email");
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByTestId("email-error")).toHaveTextContent("Ingresá un email válido");
    expect(screen.queryByTestId("password-error")).not.toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText("Contraseña");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows the pending-integration notice on a valid submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "manager@empresa.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("password-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("login-notice")).toHaveTextContent(
      "Autenticación pendiente de integración con el backend.",
    );
  });

  it("clears stale errors after a corrected resubmit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByTestId("email-error")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "manager@empresa.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreta123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("password-error")).not.toBeInTheDocument();
  });
});
