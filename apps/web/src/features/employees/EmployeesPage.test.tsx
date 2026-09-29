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
import { EmployeesPage } from "@/features/employees/EmployeesPage";

vi.mock("@/lib/api", () => ({
  getEmployees: async () => [],
  createEmployee: vi.fn(),
  getOrganizations: async () => ({
    summary: {
      companies: 2,
      establishments: 2,
      departments: 2,
      costCenters: 2,
    },
    companies: [
      {
        id: "officamp",
        legalName: "Officecamp Ltda",
        tradeName: "Officecamp",
        document: "12345678000190",
        status: "active",
        city: "Campinas",
        state: "SP",
        employeesCount: 0,
        establishmentsCount: 1,
      },
      {
        id: "outra_empresa",
        legalName: "Outra Empresa Ltda",
        tradeName: "Outra Empresa",
        document: "98765432000110",
        status: "active",
        city: "Campinas",
        state: "SP",
        employeesCount: 0,
        establishmentsCount: 1,
      },
    ],
    units: [
      {
        id: "campo_figueiras",
        companyId: "officamp",
        parentId: null,
        type: "establishment",
        code: "POSTO-CDF",
        name: "Residencial Campo das Figueiras",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "operacao_figueiras",
        companyId: "officamp",
        parentId: "campo_figueiras",
        type: "department",
        code: "DEPTO-CDF",
        name: "Operação Campo das Figueiras",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "cc_figueiras",
        companyId: "officamp",
        parentId: "operacao_figueiras",
        type: "cost_center",
        code: "CC-CDF-001",
        name: "Campo das Figueiras",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "outro_posto",
        companyId: "outra_empresa",
        parentId: null,
        type: "establishment",
        code: "POSTO-002",
        name: "Outro Posto",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "outro_departamento",
        companyId: "outra_empresa",
        parentId: "outro_posto",
        type: "department",
        code: "DEPTO-002",
        name: "Outro Departamento",
        employeesCount: 0,
        status: "active",
      },
      {
        id: "outro_cc",
        companyId: "outra_empresa",
        parentId: "outro_departamento",
        type: "cost_center",
        code: "CC-002",
        name: "Outro Centro de Custo",
        employeesCount: 0,
        status: "active",
      },
    ],
  }),
}));

describe("employee organization fields", () => {
  it("loads saved options and keeps the hierarchy linked to the selected company", async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider
          client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
        >
          <EmployeesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /Novo colaborador/ }),
    );
    const dialog = screen.getByRole("dialog");
    const company = within(dialog).getByLabelText("Empresa");
    const establishment = within(dialog).getByLabelText("Estabelecimento");
    const department = within(dialog).getByLabelText("Departamento");
    const costCenter = within(dialog).getByLabelText("Centro de custo");

    await waitFor(() => expect(company).toHaveValue("officamp"));
    expect(establishment).toHaveValue("campo_figueiras");
    expect(department).toHaveValue("operacao_figueiras");
    expect(costCenter).toHaveValue("cc_figueiras");
    expect(
      within(establishment).getByRole("option", {
        name: "Residencial Campo das Figueiras",
      }),
    ).toBeInTheDocument();

    fireEvent.change(company, { target: { value: "outra_empresa" } });

    expect(establishment).toHaveValue("outro_posto");
    expect(department).toHaveValue("outro_departamento");
    expect(costCenter).toHaveValue("outro_cc");
    expect(
      within(establishment).queryByRole("option", {
        name: "Residencial Campo das Figueiras",
      }),
    ).not.toBeInTheDocument();
  });
});
