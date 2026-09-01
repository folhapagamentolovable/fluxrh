import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BenefitsPage } from "@/features/benefits/BenefitsPage";
import { TerminationsPage } from "@/features/terminations/TerminationsPage";

const spies = vi.hoisted(() => ({ createBenefitEnrollment: vi.fn(), createTermination: vi.fn() }));
const employee = { id:"emp_real",fullName:"Ana Operacional",registration:"MAT-42",status:"active",position:"Analista",salary:4200,companyName:"Empresa Real",departmentName:"RH",hireDate:"2022-02-01" };

vi.mock("@/lib/api", () => ({
  getEmployees: async () => [employee],
  getBenefitsOverview: async () => ({ summary:{activePlans:1,activeEnrollments:0,monthlyCompanyCost:0,monthlyEmployeeDiscount:0,pendingEnrollments:0,pendingMovements:0}, plans:[{id:"plan_real",name:"Plano Real",employeeAmount:10,type:"health",active:true,provider:"Fornecedor",companyAmount:20,payrollCode:"B01",enrolledCount:0,eligibility:"Todos"}], enrollments:[],movements:[],payrollPreview:[] }),
  createBenefitEnrollment: spies.createBenefitEnrollment,
  createEmployeeMovement: vi.fn(), decideEmployeeMovement: vi.fn(),
  getTerminations: async () => ({summary:{active:0,pendingApproval:0,completedThisMonth:0,openExceptions:0,pendingTasks:0,estimatedNet:0},processes:[]}),
  createTermination: spies.createTermination, resolveTerminationException:vi.fn(),toggleTerminationTask:vi.fn(),approveTermination:vi.fn(),
}));

function renderPage(page: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{page}</QueryClientProvider>);
}

describe("financial forms use visible values", () => {
  it("submits the selected employee and typed benefit date", async () => {
    spies.createBenefitEnrollment.mockResolvedValue({});
    renderPage(<BenefitsPage/>);
    fireEvent.click(await screen.findByRole("button",{name:/Conceder benefício/i}));
    const dialog=screen.getByRole("dialog");
    await within(dialog).findByRole("option",{name:/Ana Operacional/});
    fireEvent.change(within(dialog).getByLabelText("Colaborador"),{target:{value:"emp_real"}});
    fireEvent.change(within(dialog).getByPlaceholderText("dd/mm/aaaa"),{target:{value:"15/09/2026"}});
    const submit=within(dialog).getByRole("button",{name:"Criar concessão"});
    await waitFor(()=>expect(submit).toBeEnabled()); fireEvent.click(submit);
    await waitFor(()=>expect(spies.createBenefitEnrollment).toHaveBeenCalledWith(expect.objectContaining({employeeId:"emp_real",employeeName:"Ana Operacional",startDate:"2026-09-15",planId:"plan_real"})));
  });

  it("builds termination payload from the selected employee and typed dates", async () => {
    spies.createTermination.mockResolvedValue({});
    renderPage(<TerminationsPage/>);
    fireEvent.click(await screen.findByRole("button",{name:/Novo desligamento/i}));
    const dialog=screen.getByRole("dialog");
    await within(dialog).findByRole("option",{name:/Ana Operacional/});
    fireEvent.change(within(dialog).getByLabelText("Colaborador"),{target:{value:"emp_real"}});
    fireEvent.change(within(dialog).getByLabelText("Solicitado por"),{target:{value:"Cláudia DP"}});
    const dates=within(dialog).getAllByPlaceholderText("dd/mm/aaaa");
    fireEvent.change(dates[0],{target:{value:"30/09/2026"}}); fireEvent.change(dates[1],{target:{value:"29/09/2026"}});
    fireEvent.change(within(dialog).getByLabelText("Justificativa"),{target:{value:"Solicitação formal conferida"}});
    const submit=within(dialog).getByRole("button",{name:"Iniciar workflow"});
    await waitFor(()=>expect(submit).toBeEnabled()); fireEvent.click(submit);
    await waitFor(()=>expect(spies.createTermination).toHaveBeenCalledWith(expect.objectContaining({employeeId:"emp_real",employeeName:"Ana Operacional",baseSalary:4200,terminationDate:"2026-09-30",lastWorkedDate:"2026-09-29",requestedBy:"Cláudia DP"})));
  });
});
