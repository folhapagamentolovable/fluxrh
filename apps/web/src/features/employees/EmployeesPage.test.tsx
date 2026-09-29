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

const spies = vi.hoisted(() => ({ createEmployee: vi.fn() }));

vi.mock("@/lib/api", () => ({
  getEmployees: async () => [],
  createEmployee: spies.createEmployee,
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

  it("sends the required work schedule in the employee payload", async () => {
    spies.createEmployee.mockResolvedValue({ id: "employee_real" });
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
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Empresa")).toHaveValue("officamp"),
    );
    fireEvent.change(within(dialog).getByLabelText("Nome completo"), {
      target: { value: "José da Silva" },
    });
    fireEvent.change(within(dialog).getByLabelText("CPF"), {
      target: { value: "52998224725" },
    });
    fireEvent.change(within(dialog).getByLabelText("E-mail"), {
      target: { value: "jose@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Telefone"), {
      target: { value: "19981259695" },
    });
    const dates = within(dialog).getAllByLabelText(
      "Data no formato dd/mm/aaaa",
    );
    fireEvent.change(dates[0], { target: { value: "11/06/1969" } });
    fireEvent.change(dates[1], { target: { value: "26/09/2025" } });
    fireEvent.change(within(dialog).getByLabelText("Cargo"), {
      target: { value: "Zelador" },
    });
    fireEvent.change(within(dialog).getByLabelText("Gestor"), {
      target: { value: "Paulo Boaventura" },
    });
    fireEvent.change(within(dialog).getByLabelText("Escala / jornada"), {
      target: { value: "12x36 · 07:00–19:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("Salário"), {
      target: { value: "2145" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Criar e iniciar admissão",
      }),
    );

    await waitFor(() =>
      expect(spies.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "José da Silva",
          companyId: "officamp",
          establishmentId: "campo_figueiras",
          departmentId: "operacao_figueiras",
          costCenterId: "cc_figueiras",
          position: "Zelador",
          workSchedule: "12x36 · 07:00–19:00",
          salary: 2145,
        }),
        expect.anything(),
      ),
    );
  });
});
