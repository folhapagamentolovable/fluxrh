import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlledRealCyclesPanel } from "./ControlledRealCyclesPanel";

const api = vi.hoisted(() => ({
  getControlledRealCycles: vi.fn(),
  prepareControlledRealCycle: vi.fn(),
  approveControlledRealCycle: vi.fn(),
  appendControlledRealCycleEvidence: vi.fn(),
}));
vi.mock("@/lib/api", () => api);

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ControlledRealCyclesPanel /></QueryClientProvider>);
}

describe("ControlledRealCyclesPanel", () => {
  beforeEach(() => {
    api.getControlledRealCycles.mockReset().mockResolvedValue([]);
    api.prepareControlledRealCycle.mockReset().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
  });

  it("explica a barreira operacional e não possui violações Axe", async () => {
    const { container } = renderPanel();
    expect(await screen.findByRole("heading", { name: "Primeiro ciclo real controlado" })).toBeVisible();
    expect(screen.getByText(/não executa nem substitui a folha oficial/i)).toBeVisible();
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("exige todo o checklist antes de preparar o ciclo", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole("button", { name: /Preparar ciclo/ }));
    await user.type(screen.getByLabelText("Competência"), "09/2026");
    await user.type(screen.getByLabelText("Título"), "Ciclo paralelo setembro");
    await user.click(screen.getByLabelText("Cadastro e documentos"));
    await user.type(screen.getByLabelText("Revisor humano"), "Neozinho");
    await user.type(screen.getByLabelText("Plano de rollback"), "Restaurar o checkpoint validado pelo responsável em caso de divergência crítica.");
    const submit = screen.getByRole("button", { name: "Preparar sem executar" });
    expect(submit).toBeDisabled();
    for (const label of ["Termos e limites aprovados", "Responsáveis nomeados", "Acessos mínimos revisados", "Backup verificado", "Rollback testado", "Inventário de dados aprovado", "Revisor humano identificado"]) await user.click(screen.getByLabelText(label));
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(api.prepareControlledRealCycle).toHaveBeenCalledWith(expect.objectContaining({ competence: "2026-09", scope: ["employees"], humanReviewer: "Neozinho" }));
  });
});
