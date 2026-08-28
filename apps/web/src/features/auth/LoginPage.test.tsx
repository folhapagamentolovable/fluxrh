import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const { signInWithPassword, signUp } = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn() }));

vi.mock("@/auth/AuthProvider", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInWithPassword, signUp } },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signUp.mockReset();
  });

  it("oferece formulário de login semanticamente válido", async () => {
    const { container } = render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Entre no FluxRH" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("alterna para criação de conta e anuncia erros de autenticação", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { session: null }, error: { message: "E-mail já cadastrado" } });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Primeiro acesso? Criar conta" }));
    await user.type(screen.getByRole("textbox", { name: "Nome completo" }), "Pessoa Teste");
    await user.type(screen.getByRole("textbox", { name: "E-mail" }), "pessoa@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.click(screen.getByRole("button", { name: "Criar acesso" }));

    expect(signUp).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail já cadastrado");
  });
});
