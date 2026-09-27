import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordPage } from "./ChangePasswordPage";

const { updateUser, navigate } = vi.hoisted(() => ({ updateUser: vi.fn(), navigate: vi.fn() }));

vi.mock("react-router-dom", async importOriginal => ({
  ...await importOriginal<typeof import("react-router-dom")>(),
  useNavigate: () => navigate,
}));
vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { user_metadata: { full_name: "Neozinho", must_change_password: true } } }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { updateUser } } }));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    updateUser.mockReset();
    navigate.mockReset();
  });

  it("troca a senha provisória e remove a marca de primeiro acesso", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: null });
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);

    await user.type(screen.getByLabelText("Nova senha"), "nova-senha-segura");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "nova-senha-segura");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(updateUser).toHaveBeenCalledWith({
      password: "nova-senha-segura",
      data: { full_name: "Neozinho", must_change_password: false },
    });
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("não envia senhas divergentes", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);
    await user.type(screen.getByLabelText("Nova senha"), "nova-senha-segura");
    await user.type(screen.getByLabelText("Confirmar nova senha"), "outra-senha-segura");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(screen.getByRole("alert")).toHaveTextContent("não coincidem");
    expect(updateUser).not.toHaveBeenCalled();
  });
});
