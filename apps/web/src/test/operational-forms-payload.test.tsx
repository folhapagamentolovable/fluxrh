import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbsencesPage } from "@/features/absences/AbsencesPage";
import { TimeTrackingPage } from "@/features/time-tracking/TimeTrackingPage";

const spies = vi.hoisted(() => ({
  createMedicalCertificate: vi.fn(),
  registerTimePunch: vi.fn(),
  uploadPrivateFile: vi.fn(),
  deletePrivateFile: vi.fn(),
}));

const employee = {
  id: "emp_real",
  fullName: "Ana Operacional",
  registration: "MAT-42",
  status: "active",
  position: "Vigia",
  salary: 2091.57,
  companyName: "Grupo Flux",
  departmentName: "Operações",
  hireDate: "2025-01-01",
};

vi.mock("@/lib/api", () => ({
  getEmployees: async () => [employee],
  getAbsenceOverview: async () => ({
    summary: { vacationBalance: 0, requestsPending: 0, periodsAtRisk: 0, certificatesUnderReview: 0, employeesOnLeave: 0, absencesThisMonth: 0 },
    vacationPeriods: [], vacationRequests: [], occurrences: [], certificates: [], leaves: [], calendar: [],
  }),
  createMedicalCertificate: spies.createMedicalCertificate,
  uploadPrivateFile: spies.uploadPrivateFile,
  deletePrivateFile: spies.deletePrivateFile,
  createVacationRequest: vi.fn(), decideVacationRequest: vi.fn(), reviewMedicalCertificate: vi.fn(),
  getTimeOverview: async () => ({
    summary: { presentToday: 0, expectedToday: 1, openExceptions: 0, overtimeHours: 0, positiveBankMinutes: 0, closingProgress: 0 },
    qrStation: { id: "station_real", name: "Posto Florence", token: "token-real", rotatesAt: "2026-09-05T12:00:00Z", active: true },
    schedules: [], punches: [], exceptions: [],
    employees: [{ employeeId: "emp_real", employeeName: "Ana Operacional", position: "Vigia", scheduleName: "T1 Noturno", workedMinutes: 0, expectedMinutes: 720, balanceMinutes: -720, overtimeMinutes: 0, absenceDays: 0, exceptionCount: 0, status: "open", days: [] }],
  }),
  getCurrentTimeCompetence: async () => null,
  registerTimePunch: spies.registerTimePunch,
  resolveTimeException: vi.fn(), approveEmployeeTimesheet: vi.fn(), closeTimeCompetence: vi.fn(),
}));

function renderPage(page: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {page}
    </QueryClientProvider>,
  );
}

describe("operational forms use visible values", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a punch for the selected employee and typed device", async () => {
    spies.registerTimePunch.mockResolvedValue({});
    renderPage(<TimeTrackingPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Registrar ponto/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Identificação do dispositivo"), { target: { value: "tablet-florence-01" } });
    fireEvent.change(within(dialog).getByLabelText("Tipo de marcação"), { target: { value: "clock_out" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar marcação" }));
    await waitFor(() => expect(spies.registerTimePunch).toHaveBeenCalledWith({
      employeeId: "emp_real", employeeName: "Ana Operacional", type: "clock_out",
      token: "token-real", deviceId: "tablet-florence-01", locationName: "Posto Florence",
    }));
  });

  it("builds certificate metadata from the selected employee and typed fields", async () => {
    spies.createMedicalCertificate.mockResolvedValue({});
    spies.uploadPrivateFile.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    renderPage(<AbsencesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Receber atestado/i }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByRole("option", { name: "Ana Operacional" });
    const dates = within(dialog).getAllByPlaceholderText("dd/mm/aaaa");
    fireEvent.change(dates[0], { target: { value: "05/09/2026" } });
    fireEvent.change(dates[1], { target: { value: "06/09/2026" } });
    fireEvent.change(within(dialog).getByLabelText("Emissor"), { target: { value: "Clínica Florence" } });
    fireEvent.change(within(dialog).getByLabelText("Registro profissional"), { target: { value: "CRM-SP 123456" } });
    const file = new File(["atestado"], "atestado-ana.pdf", { type: "application/pdf" });
    fireEvent.change(within(dialog).getByLabelText("Arquivo do atestado"), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar e registrar atestado" }));
    await waitFor(() => expect(spies.uploadPrivateFile).toHaveBeenCalledWith(file, {
      category: "medical_certificates", relatedEntityType: "employee", relatedEntityId: "emp_real",
    }));
    await waitFor(() => expect(spies.createMedicalCertificate).toHaveBeenCalledWith({
      employeeId: "emp_real", employeeName: "Ana Operacional", startDate: "2026-09-05", endDate: "2026-09-06",
      issuer: "Clínica Florence", professionalRegistration: "CRM-SP 123456", documentName: "atestado-ana.pdf",
      documentAssetId: "11111111-1111-4111-8111-111111111111",
    }));
  });

  it("removes the uploaded asset when certificate persistence fails", async () => {
    spies.uploadPrivateFile.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });
    spies.createMedicalCertificate.mockRejectedValue(new Error("persistence failed"));
    spies.deletePrivateFile.mockResolvedValue({});
    renderPage(<AbsencesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Receber atestado/i }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByRole("option", { name: "Ana Operacional" });
    const dates = within(dialog).getAllByPlaceholderText("dd/mm/aaaa");
    fireEvent.change(dates[0], { target: { value: "05/09/2026" } });
    fireEvent.change(dates[1], { target: { value: "06/09/2026" } });
    fireEvent.change(within(dialog).getByLabelText("Emissor"), { target: { value: "Clínica Florence" } });
    fireEvent.change(within(dialog).getByLabelText("Registro profissional"), { target: { value: "CRM-SP 123456" } });
    fireEvent.change(within(dialog).getByLabelText("Arquivo do atestado"), { target: { files: [new File(["x"], "falha.pdf", { type: "application/pdf" })] } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar e registrar atestado" }));
    await waitFor(() => expect(spies.deletePrivateFile).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222"));
    expect(await within(dialog).findByText(/Nenhum arquivo incompleto será mantido/)).toBeVisible();
  });
});
