import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AbsencesPage } from "@/features/absences/AbsencesPage";

const spies = vi.hoisted(() => ({
  decideVacationRequest: vi.fn(),
  reviewMedicalCertificate: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  getAbsenceOverview: async () => ({
    summary: {
      vacationBalance: 30,
      requestsPending: 1,
      periodsAtRisk: 0,
      certificatesUnderReview: 1,
      employeesOnLeave: 0,
      absencesThisMonth: 0,
    },
    vacationPeriods: [
      {
        id: "period_real",
        employeeId: "employee_real",
        employeeName: "Ana Operacional",
        acquisitionStart: "2025-01-01",
        acquisitionEnd: "2025-12-31",
        concessionDeadline: "2026-12-31",
        earnedDays: 30,
        usedDays: 0,
        scheduledDays: 0,
        balanceDays: 30,
        status: "open",
        risk: "normal",
      },
    ],
    vacationRequests: [
      {
        id: "vacation_real",
        employeeId: "employee_real",
        employeeName: "Ana Operacional",
        companyName: "Grupo Flux",
        departmentName: "Operações",
        periodId: "period_real",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        days: 30,
        soldDays: 0,
        advanceThirteenth: false,
        status: "pending_hr",
        requestedAt: "2026-08-01",
        coverageStatus: "confirmed",
        payrollEventStatus: "pending",
      },
    ],
    certificates: [
      {
        id: "certificate_real",
        employeeId: "employee_real",
        employeeName: "Ana Operacional",
        startDate: "2026-09-05",
        endDate: "2026-09-05",
        days: 1,
        issuer: "Clínica",
        professionalRegistration: "CRM-SP 1",
        receivedAt: "2026-09-05",
        status: "under_review",
        documentName: "atestado.pdf",
      },
    ],
    occurrences: [],
    leaves: [],
    calendar: [],
  }),
  decideVacationRequest: spies.decideVacationRequest,
  reviewMedicalCertificate: spies.reviewMedicalCertificate,
  getEmployees: async () => [],
  createMedicalCertificate: vi.fn(),
  createVacationRequest: vi.fn(),
  deletePrivateFile: vi.fn(),
  getPrivateFileDownload: vi.fn(),
  uploadPrivateFile: vi.fn(),
}));
const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AbsencesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe("absence decisions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sends the typed vacation approval justification", async () => {
    spies.decideVacationRequest.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Férias" }));
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), {
      target: { value: "Saldo e cobertura conferidos pelo RH." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirmar aprovação" }),
    );
    await waitFor(() =>
      expect(spies.decideVacationRequest).toHaveBeenCalledWith(
        "vacation_real",
        "approve",
        "Saldo e cobertura conferidos pelo RH.",
      ),
    );
  });
  it("sends the typed certificate rejection justification", async () => {
    spies.reviewMedicalCertificate.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^Atestados/ }));
    fireEvent.click(screen.getByRole("button", { name: "Rejeitar" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Justificativa"), {
      target: { value: "Documento ilegível; solicitar novo arquivo." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirmar rejeição" }),
    );
    await waitFor(() =>
      expect(spies.reviewMedicalCertificate).toHaveBeenCalledWith(
        "certificate_real",
        "reject",
        "Documento ilegível; solicitar novo arquivo.",
      ),
    );
  });
});
