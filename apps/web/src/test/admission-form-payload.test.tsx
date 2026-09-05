import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AdmissionsPage } from "@/features/admissions/AdmissionsPage";
const spies = vi.hoisted(() => ({ createAdmission: vi.fn() }));
vi.mock("@/lib/api", () => ({
  getAdmissions: async () => [],
  getOrganizations: async () => ({
    summary: {
      companies: 1,
      establishments: 1,
      departments: 1,
      costCenters: 0,
    },
    companies: [
      {
        id: "company_real",
        legalName: "Grupo Flux Ltda",
        tradeName: "Grupo Flux",
        document: "12345678000190",
        status: "active",
        city: "São Paulo",
        state: "SP",
        employeesCount: 0,
        establishmentsCount: 1,
      },
    ],
    units: [
      {
        id: "est_real",
        companyId: "company_real",
        parentId: null,
        type: "establishment",
        code: "EST",
        name: "Posto Florence",
        city: "São Paulo",
        state: "SP",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "dep_real",
        companyId: "company_real",
        parentId: "est_real",
        type: "department",
        code: "OPE",
        name: "Operações",
        employeesCount: 0,
        status: "active",
      },
    ],
  }),
  createAdmission: spies.createAdmission,
}));
describe("admission form", () => {
  it("uses the selected organization structure and typed manager", async () => {
    spies.createAdmission.mockResolvedValue({ id: "admission_real" });
    render(
      <MemoryRouter>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <AdmissionsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /Nova admissão/ }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome completo"), {
      target: { value: "João da Silva" },
    });
    fireEvent.change(within(dialog).getByLabelText("E-mail"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Telefone"), {
      target: { value: "11987654321" },
    });
    fireEvent.change(within(dialog).getByLabelText("CPF"), {
      target: { value: "52998224725" },
    });
    fireEvent.change(within(dialog).getByLabelText("Empresa"), {
      target: { value: "company_real" },
    });
    fireEvent.change(within(dialog).getByLabelText("Estabelecimento"), {
      target: { value: "Posto Florence" },
    });
    fireEvent.change(within(dialog).getByLabelText("Departamento"), {
      target: { value: "Operações" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cargo"), {
      target: { value: "Vigia" },
    });
    fireEvent.change(within(dialog).getByLabelText("Gestor"), {
      target: { value: "Neozinho" },
    });
    fireEvent.change(within(dialog).getByLabelText("Salário"), {
      target: { value: "2091.57" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("dd/mm/aaaa"), {
      target: { value: "15/09/2026" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Iniciar workflow" }),
    );
    await waitFor(() =>
      expect(spies.createAdmission).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateName: "João da Silva",
          companyId: "company_real",
          companyName: "Grupo Flux",
          establishmentName: "Posto Florence",
          departmentName: "Operações",
          managerName: "Neozinho",
          expectedStartDate: "2026-09-15",
          salary: 2091.57,
        }),
        expect.anything(),
      ),
    );
  });
});
