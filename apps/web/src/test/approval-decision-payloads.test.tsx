import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenefitsPage } from "@/features/benefits/BenefitsPage";
import { EmployeePortalPage } from "@/features/portal/EmployeePortalPage";
const spies = vi.hoisted(() => ({
  decideEmployeeMovement: vi.fn(),
  decidePortalApproval: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  getBenefitsOverview: async () => ({
    summary: {
      activePlans: 0,
      activeEnrollments: 0,
      monthlyCompanyCost: 0,
      monthlyEmployeeDiscount: 0,
      pendingEnrollments: 0,
      pendingMovements: 1,
    },
    plans: [],
    enrollments: [],
    payrollPreview: [],
    movements: [
      {
        id: "movement_real",
        employeeId: "employee_real",
        employeeName: "Ana Operacional",
        type: "salary_change",
        requestedAt: "2026-09-01",
        effectiveDate: "2026-10-01",
        status: "pending_hr",
        currentValue: "R$ 2.091,57",
        newValue: "R$ 2.200,00",
        currentSalary: 2091.57,
        newSalary: 2200,
        reason: "Reajuste",
        requestedBy: "Neozinho",
        approvals: [],
        payrollImpact: "future",
        documentStatus: "pending",
      },
    ],
  }),
  decideEmployeeMovement: spies.decideEmployeeMovement,
  getEmployees: async () => [],
  createBenefitEnrollment: vi.fn(),
  createEmployeeMovement: vi.fn(),
  getEmployeePortal: async () => ({
    profile: {
      id: "manager",
      name: "Neozinho",
      registration: "1",
      position: "Gestor",
      department: "Operações",
      company: "Grupo Flux",
      email: "n@example.com",
      hireDate: "2025-01-01",
    },
    summary: {
      vacationBalance: 0,
      timeBankMinutes: 0,
      openRequests: 0,
      pendingDocuments: 0,
    },
    quickActions: [],
    requests: [],
    documents: [],
    team: [],
    approvals: [
      {
        id: "approval_real",
        type: "Férias",
        employeeId: "employee_real",
        employeeName: "Ana Operacional",
        description: "Férias em setembro",
        requestedAt: "2026-09-01",
        status: "pending",
      },
    ],
  }),
  decidePortalApproval: spies.decidePortalApproval,
  createServiceRequest: vi.fn(),
}));
const wrap = (node: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {node}
    </QueryClientProvider>,
  );
describe("approval decisions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sends a typed benefit movement justification", async () => {
    spies.decideEmployeeMovement.mockResolvedValue({});
    wrap(<BenefitsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /^Movimentações/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Aprovar etapa" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), {
      target: { value: "Reajuste e vigência conferidos." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirmar aprovação" }),
    );
    await waitFor(() =>
      expect(spies.decideEmployeeMovement).toHaveBeenCalledWith(
        "movement_real",
        "approve",
        "Reajuste e vigência conferidos.",
      ),
    );
  });
  it("sends a typed manager approval justification", async () => {
    spies.decidePortalApproval.mockResolvedValue({});
    wrap(<EmployeePortalPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: /^Minha equipe/ }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Aprovar solicitação de Ana Operacional",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), {
      target: { value: "Cobertura da equipe confirmada." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirmar aprovação" }),
    );
    await waitFor(() =>
      expect(spies.decidePortalApproval).toHaveBeenCalledWith(
        "approval_real",
        "approve",
        "Cobertura da equipe confirmada.",
      ),
    );
  });
});
