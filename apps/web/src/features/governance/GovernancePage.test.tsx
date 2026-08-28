import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { GovernancePage } from "./GovernancePage";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><GovernancePage /></QueryClientProvider>);
}

describe("GovernancePage", () => {
  it("relaciona abas e painéis sem violações Axe", async () => {
    const { container } = renderPage();
    const usersTab = await screen.findByRole("tab", { name: /Usuários e convites/ });

    expect(usersTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /Usuários e convites/ })).toBeVisible();
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("permite navegar nas abas pelo teclado e nomeia ações sensíveis", async () => {
    const user = userEvent.setup();
    renderPage();
    const usersTab = await screen.findByRole("tab", { name: /Usuários e convites/ });
    usersTab.focus();

    await user.keyboard("{ArrowRight}");
    const permissionsTab = screen.getByRole("tab", { name: "Perfis e permissões" });
    await waitFor(() => expect(permissionsTab).toHaveFocus());
    expect(permissionsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Perfis e permissões" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Editar permissões de .* para Gestor/ }).length).toBeGreaterThan(0);
  });
});
