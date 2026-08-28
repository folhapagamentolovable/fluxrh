import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShellView } from "./AppShell";

const signOut = vi.fn(async () => undefined);

function renderShell() {
  return render(<MemoryRouter><Routes><Route element={<AppShellView displayName="RH Teste" signOut={signOut} />}><Route index element={<h1>Painel principal</h1>} /></Route></Routes></MemoryRouter>);
}

describe("AppShell", () => {
  it("oferece regiões e atalhos acessíveis", async () => {
    const { container } = renderShell();
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Painel principal" }));
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("abre e fecha o menu móvel de forma anunciável", async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole("button", { name: "Abrir menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("link", { name: "Visão geral" }));
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
