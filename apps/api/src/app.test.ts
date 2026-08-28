import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const app = buildApp();

afterAll(() => app.close());

describe("FluxRH API", () => {
  it("reports service health", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });

  it("reports persistent-environment readiness", async () => {
    const previousPersistence = process.env.FLUXRH_PERSISTENCE;
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    process.env.FLUXRH_PERSISTENCE = "supabase";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";

    try {
      const response = await app.inject({ method: "GET", url: "/ready" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: "ready",
        persistence: "supabase",
        supabaseConfigured: true,
      });
    } finally {
      if (previousPersistence === undefined) delete process.env.FLUXRH_PERSISTENCE;
      else process.env.FLUXRH_PERSISTENCE = previousPersistence;
      if (previousUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
      else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
    }
  });

  it("returns the operational dashboard", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/operations/dashboard" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.metrics.activeEmployees).toBeGreaterThan(0);
  });

  it("returns the organizational structure", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/organizations" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.companies).toHaveLength(2);
    expect(response.json().data.units.length).toBeGreaterThan(5);
  });

  it("returns employees and a complete profile", async () => {
    const list = await app.inject({ method: "GET", url: "/api/v1/employees" });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(50);
    const finalPilotPage = await app.inject({ method: "GET", url: "/api/v1/employees?limit=50&offset=100" });
    expect(finalPilotPage.statusCode).toBe(200);
    expect(finalPilotPage.json().data.length).toBeGreaterThanOrEqual(20);
    const profile = await app.inject({ method: "GET", url: "/api/v1/employees/emp_carlos" });
    expect(profile.statusCode).toBe(200);
    expect(profile.json().data.documents.length).toBeGreaterThan(0);
  });

  it("filters and paginates employees server-side with bounded input", async () => {
    const filtered = await app.inject({ method: "GET", url: "/api/v1/employees?q=Carlos&status=active&limit=1&offset=0" });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json().data).toHaveLength(1);
    expect(filtered.json().data[0].fullName).toBe("Carlos Mendes");
    const invalid = await app.inject({ method: "GET", url: "/api/v1/employees?status=unknown" });
    expect(invalid.statusCode).toBe(400);
  });

  it("creates an employee in onboarding", async () => {
    const response = await app.inject({ method: "POST", url: "/api/v1/employees", payload: { fullName: "Joana Martins", cpf: "123.456.789-00", email: "joana@fluxrh.local", phone: "(11) 99999-0000", birthDate: "1995-05-10", hireDate: "2026-09-01", companyId: "company_flux", establishmentId: "est_sp", departmentId: "dept_people", costCenterId: "cc_people", position: "Assistente de RH", salary: 3200, workSchedule: "Seg–Sex · 08:00–17:48", managerName: "Marina Alves" } });
    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({ fullName: "Joana Martins", status: "onboarding" });
  });

  it("runs the admission workflow through every remaining stage", async () => {
    const overview = await app.inject({ method: "GET", url: "/api/v1/workflows/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.definition.steps).toHaveLength(5);

    let result = await app.inject({ method: "POST", url: "/api/v1/workflows/admissions/adm_marina/advance", payload: {} });
    expect(result.json().data.currentStep).toBe("validation");
    expect(result.json().data.documents.every((document: { status: string }) => document.status === "valid")).toBe(true);
    result = await app.inject({ method: "POST", url: "/api/v1/workflows/admissions/adm_marina/advance", payload: {} });
    expect(result.json().data.currentStep).toBe("contract");
    result = await app.inject({ method: "POST", url: "/api/v1/workflows/admissions/adm_marina/advance", payload: {} });
    expect(result.json().data.contract.status).toBe("accepted");
    result = await app.inject({ method: "POST", url: "/api/v1/workflows/admissions/adm_marina/advance", payload: {} });
    expect(result.json().data.status).toBe("completed");
    expect(result.json().data.onboarding.checklistCompleted).toBe(result.json().data.onboarding.checklistTotal);
  });

  it("creates, lists, resolves and audits workflow exceptions", async () => {
    const created=await app.inject({method:"POST",url:"/api/v1/workflows/admissions/adm_lucas/exceptions",payload:{title:"Divergência cadastral",description:"O CPF precisa de conferência humana.",priority:"high"}});
    expect(created.statusCode).toBe(201);expect(created.json().data.status).toBe("open");
    const listed=await app.inject({method:"GET",url:"/api/v1/workflows/exceptions"});expect(listed.json().data.some((item:{id:string})=>item.id===created.json().data.id)).toBe(true);
    const resolved=await app.inject({method:"POST",url:`/api/v1/workflows/exceptions/${created.json().data.id}/resolve`,payload:{note:"CPF conferido no documento original."}});
    expect(resolved.json().data.status).toBe("resolved");
    const audit=await app.inject({method:"GET",url:"/api/v1/workflows/audit"});expect(audit.json().data.some((item:{action:string})=>item.action==="exception.resolved")).toBe(true);
  });

  it("validates documents and registers an electronic acceptance with evidence", async () => {
    const overview = await app.inject({ method: "GET", url: "/api/v1/documents/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.documents).toHaveLength(5);

    const validation = await app.inject({ method: "POST", url: "/api/v1/documents/doc_address_marina/validate", payload: { decision: "approve", note: "Documento legível e dados consistentes." } });
    expect(validation.statusCode).toBe(200);
    expect(validation.json().data.status).toBe("validated");

    const acceptance = await app.inject({ method: "POST", url: "/api/v1/documents/doc_contract_camila/accept", headers: { "user-agent": "FluxRH Test" }, payload: { signerName: "Camila Rocha", signerDocument: "***.315.***-55", statementAccepted: true } });
    expect(acceptance.statusCode).toBe(200);
    expect(acceptance.json().data.status).toBe("accepted");
    expect(acceptance.json().data.acceptance.documentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(acceptance.json().data.auditTrail[0].action).toContain("Aceite");
  });

  it("registers QR punches and resolves time exceptions", async () => {
    const overview = await app.inject({ method: "GET", url: "/api/v1/time/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.schedules).toHaveLength(3);
    expect(overview.json().data.employees[0].days.length).toBeGreaterThan(0);
    const token = overview.json().data.qrStation.token;
    const punch = await app.inject({ method: "POST", url: "/api/v1/time/punches", payload: { employeeId:"emp_marina",employeeName:"Marina Souza",type:"clock_in",token,deviceId:"test-device",locationName:"Matriz São Paulo" } });
    expect(punch.statusCode).toBe(201);
    expect(punch.json().data.source).toBe("qr_code");
    const invalid = await app.inject({ method: "POST", url: "/api/v1/time/punches", payload: { employeeId:"emp_marina",employeeName:"Marina Souza",type:"clock_in",token:"INVALID-TOKEN",deviceId:"test-device",locationName:"Matriz São Paulo" } });
    expect(invalid.statusCode).toBe(422);
    const resolution = await app.inject({ method: "POST", url: "/api/v1/time/exceptions/tex_1/resolve", payload: { note:"Saída confirmada e ajustada pelo gestor." } });
    expect(resolution.json().data.status).toBe("resolved");
    const approval = await app.inject({ method: "POST", url: "/api/v1/time/employees/emp_carlos/approve", payload: {} });
    expect(approval.json().data.status).toBe("approved");
  });

  it("calculates payroll and enforces exception-first approval", async () => {
    const overview = await app.inject({ method: "GET", url: "/api/v1/payroll/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.run.employees).toHaveLength(4);
    expect(overview.json().data.run.netTotal).toBeGreaterThan(0);
    const blocked = await app.inject({ method: "POST", url: "/api/v1/payroll/employees/emp_carlos/approve", payload: {} });
    expect(blocked.statusCode).toBe(422);
    const resolved = await app.inject({ method: "POST", url: "/api/v1/payroll/employees/emp_carlos/exceptions/pex_emp_carlos/resolve", payload: { note: "Conferido com o espelho de ponto." } });
    expect(resolved.statusCode).toBe(200);
    const approved = await app.inject({ method: "POST", url: "/api/v1/payroll/employees/emp_carlos/approve", payload: {} });
    expect(approved.json().data.status).toBe("approved");
  });

  it("manages benefit enrollments and movement approvals", async () => {
    const overview = await app.inject({ method: "GET", url: "/api/v1/benefits/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.plans).toHaveLength(4);
    expect(overview.json().data.payrollPreview.length).toBeGreaterThan(0);
    const enrollment = await app.inject({ method: "POST", url: "/api/v1/benefits/enrollments", payload: { employeeId:"emp_beatriz",employeeName:"Beatriz Lima",planId:"bp_dental",startDate:"2026-09-01",dependents:0 } });
    expect(enrollment.statusCode).toBe(201);
    expect(enrollment.json().data.payrollStatus).toBe("pending");
    const decision = await app.inject({ method: "POST", url: "/api/v1/benefits/movements/mv_1/decision", payload: { decision:"approve",note:"Movimentação conferida e aprovada." } });
    expect(decision.statusCode).toBe(200);
    expect(decision.json().data.status).toBe("approved");
    expect(decision.json().data.documentStatus).toBe("generated");
  });

  it("calculates thirteenth salary and vacation with exception control", async () => {
    const overview = await app.inject({ method:"GET",url:"/api/v1/special-calculations/overview" });
    expect(overview.statusCode).toBe(200);
    expect(overview.json().data.calculations).toHaveLength(5);
    expect(overview.json().data.summary.grossTotal).toBeGreaterThan(0);
    const blocked = await app.inject({ method:"POST",url:"/api/v1/special-calculations/calculations/sc_3/approve",payload:{} });
    expect(blocked.statusCode).toBe(422);
    const resolved = await app.inject({ method:"POST",url:"/api/v1/special-calculations/calculations/sc_3/exceptions/sce_emp_ana/resolve",payload:{note:"Avos conferidos com o afastamento."} });
    expect(resolved.statusCode).toBe(200);
    const approved = await app.inject({ method:"POST",url:"/api/v1/special-calculations/calculations/sc_3/approve",payload:{} });
    expect(approved.json().data.receiptStatus).toBe("generated");
  });
});
