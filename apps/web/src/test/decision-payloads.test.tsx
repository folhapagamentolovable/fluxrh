import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayrollPage } from "@/features/payroll/PayrollPage";

const spies = vi.hoisted(() => ({ resolvePayrollException: vi.fn() }));

const payrollEmployee = {
  id: "pay_real", employeeId: "employee_real", employeeName: "Ana Operacional",
  registration: "MAT-42", position: "Vigia", departmentName: "Operações",
  baseSalary: 2091.57, grossPay: 2091.57, deductions: 200, netPay: 1891.57,
  employerCharges: 167.33, status: "exception" as const, events: [],
  exceptions: [{ id: "exception_real", title: "Divergência de jornada", description: "Conferência necessária.", severity: "high" as const, status: "open" as const }],
};

vi.mock("@/lib/api", () => ({
  getPayrollOverview: async () => ({
    summary: { activeRun: true, employees: 1, grossTotal: 2091.57, netTotal: 1891.57, openExceptions: 1, closingProgress: 0 },
    run: { id: "run_real", companyName: "Grupo Flux", competence: "2026-09", status: "review", employeesCount: 1, processedCount: 1, exceptionsCount: 1, grossTotal: 2091.57, deductionsTotal: 200, netTotal: 1891.57, employerChargesTotal: 167.33, updatedAt: "2026-09-05T12:00:00Z", employees: [payrollEmployee] },
    legalTables: [], catalog: [], history: [],
  }),
  resolvePayrollException: spies.resolvePayrollException,
  approvePayrollEmployee: vi.fn(), closePayroll: vi.fn(), processPayroll: vi.fn(),
}));

describe("decision payloads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the justification typed when resolving a payroll exception", async () => {
    spies.resolvePayrollException.mockResolvedValue({});
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PayrollPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /^Exceções/ }));
    fireEvent.click(screen.getByRole("button", { name: "Analisar" }));
    const dialog = screen.getByRole("dialog");
    const confirmation = within(dialog).getByRole("button", { name: "Confirmar resolução" });
    expect(confirmation).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Decisão"), { target: { value: "Jornada conferida com o espelho de ponto assinado." } });
    fireEvent.click(confirmation);
    await waitFor(() => expect(spies.resolvePayrollException).toHaveBeenCalledWith(
      "employee_real", "exception_real", "Jornada conferida com o espelho de ponto assinado.",
    ));
  });
});
