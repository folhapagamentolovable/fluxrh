import type {
  CreateAdmissionInput,
  CreateBenefitEnrollmentInput,
  CreateCompanyInput,
  CreateDocumentRequestInput,
  CreateEmployeeInput,
  CreateEmployeeMovementInput,
  CreateMedicalCertificateInput,
  CreateSpecialCalculationInput,
  CreateTerminationInput,
  CreateVacationRequestInput,
} from "@fluxrh/contracts";
import { InMemoryAbsencesRepository } from "../../../api/src/modules/absences/absences.repository";
import { InMemoryBenefitsRepository } from "../../../api/src/modules/benefits/benefits.repository";
import { InMemoryDocumentsRepository } from "../../../api/src/modules/documents/documents.repository";
import { InMemoryEmployeesRepository } from "../../../api/src/modules/employees/employees.repository";
import { InMemoryOperationsRepository } from "../../../api/src/modules/operations/operations.repository";
import { InMemoryOrganizationsRepository } from "../../../api/src/modules/organizations/organizations.repository";
import { InMemoryPayrollRepository } from "../../../api/src/modules/payroll/payroll.repository";
import { InMemorySpecialRepository } from "../../../api/src/modules/special-calculations/special.repository";
import { InMemoryTimeRepository } from "../../../api/src/modules/time-tracking/time.repository";
import { InMemoryTerminationsRepository } from "../../../api/src/modules/terminations/termination.repository";
import { InMemoryWorkflowsRepository } from "../../../api/src/modules/workflows/workflows.repository";

const operations = new InMemoryOperationsRepository();
const organizations = new InMemoryOrganizationsRepository();
const employees = new InMemoryEmployeesRepository();
const workflows = new InMemoryWorkflowsRepository();
const documents = new InMemoryDocumentsRepository();
const time = new InMemoryTimeRepository();
const absences = new InMemoryAbsencesRepository();
const payroll = new InMemoryPayrollRepository();
const benefits = new InMemoryBenefitsRepository();
const special = new InMemorySpecialRepository();
const terminations = new InMemoryTerminationsRepository();

function body<T>(options?: RequestInit): T {
  return JSON.parse(String(options?.body ?? "{}")) as T;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

export async function localDataRequest(url: string, options?: RequestInit): Promise<unknown> {
  const method = options?.method ?? "GET";
  let match: RegExpMatchArray | null;

  if (method === "GET" && url === "/api/v1/operations/dashboard") return operations.getDashboard();
  if (method === "GET" && url === "/api/v1/organizations") return organizations.getSnapshot();
  if (method === "POST" && url === "/api/v1/organizations/companies") return organizations.createCompany(body<CreateCompanyInput>(options));
  if (method === "GET" && url === "/api/v1/employees") return employees.list();
  if (method === "GET" && (match = url.match(/^\/api\/v1\/employees\/([^/]+)$/))) return required(await employees.findById(match[1]), "Colaborador não encontrado.");
  if (method === "POST" && url === "/api/v1/employees") return employees.create(body<CreateEmployeeInput>(options));

  if (method === "GET" && url === "/api/v1/workflows/overview") return workflows.overview();
  if (method === "GET" && url === "/api/v1/workflows/admissions") return workflows.list();
  if (method === "GET" && (match = url.match(/^\/api\/v1\/workflows\/admissions\/([^/]+)$/))) return required(await workflows.find(match[1]), "Admissão não encontrada.");
  if (method === "POST" && url === "/api/v1/workflows/admissions") return workflows.create(body<CreateAdmissionInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/workflows\/admissions\/([^/]+)\/advance$/))) return required(await workflows.advance(match[1], body<{note?:string}>(options).note), "Admissão não encontrada.");

  if (method === "GET" && url === "/api/v1/documents/overview") return documents.overview();
  if (method === "GET" && (match = url.match(/^\/api\/v1\/documents\/([^/]+)$/))) return required(await documents.find(match[1]), "Documento não encontrado.");
  if (method === "POST" && url === "/api/v1/documents/requests") return documents.create(body<CreateDocumentRequestInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/documents\/([^/]+)\/validate$/))) { const input=body<{decision:"approve"|"reject";note:string}>(options); return required(await documents.validate(match[1],input.decision,input.note),"Documento não encontrado."); }
  if (method === "POST" && (match = url.match(/^\/api\/v1\/documents\/([^/]+)\/accept$/))) { const input=body<{signerName:string;signerDocument:string}>(options); return required(await documents.accept(match[1],input.signerName,input.signerDocument,"lovable-preview","FluxRH local data"),"Documento não encontrado."); }

  if (method === "GET" && url === "/api/v1/time/overview") return time.overview();
  if (method === "POST" && url === "/api/v1/time/punches") { const result=await time.register(body<Parameters<typeof time.register>[0]>(options)); if("error" in result) throw new Error("Token de ponto inválido."); return result.data; }
  if (method === "POST" && (match = url.match(/^\/api\/v1\/time\/exceptions\/([^/]+)\/resolve$/))) return required(await time.resolve(match[1],body<{note:string}>(options).note),"Exceção não encontrada.");
  if (method === "POST" && (match = url.match(/^\/api\/v1\/time\/employees\/([^/]+)\/approve$/))) return required(await time.approveEmployee(match[1]),"Colaborador não encontrado.");

  if (method === "GET" && url === "/api/v1/absences/overview") return absences.overview();
  if (method === "POST" && url === "/api/v1/absences/vacations") { const result=await absences.createVacation(body<CreateVacationRequestInput>(options)); if("error" in result) throw new Error(result.error); return result.data; }
  if (method === "POST" && (match = url.match(/^\/api\/v1\/absences\/vacations\/([^/]+)\/decision$/))) { const input=body<{decision:"approve"|"reject";note:string}>(options); return required(await absences.decideVacation(match[1],input.decision,input.note),"Solicitação não encontrada."); }
  if (method === "POST" && url === "/api/v1/absences/certificates") return absences.createCertificate(body<CreateMedicalCertificateInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/absences\/certificates\/([^/]+)\/review$/))) { const input=body<{decision:"approve"|"reject";note:string}>(options); return required(await absences.reviewCertificate(match[1],input.decision,input.note),"Atestado não encontrado."); }

  if (method === "GET" && url === "/api/v1/payroll/overview") return payroll.overview();
  if (method === "POST" && (match = url.match(/^\/api\/v1\/payroll\/employees\/([^/]+)\/exceptions\/([^/]+)\/resolve$/))) return required(await payroll.resolve(match[1],match[2]),"Exceção não encontrada.");
  if (method === "POST" && (match = url.match(/^\/api\/v1\/payroll\/employees\/([^/]+)\/approve$/))) return required(await payroll.approve(match[1]),"Existem exceções abertas.");
  if (method === "POST" && url === "/api/v1/payroll/close") { const result=await payroll.close(); if("error" in result) throw new Error("Existem colaboradores pendentes."); return result.data; }

  if (method === "GET" && url === "/api/v1/benefits/overview") return benefits.overview();
  if (method === "POST" && url === "/api/v1/benefits/enrollments") return required(await benefits.enroll(body<CreateBenefitEnrollmentInput>(options)),"Plano não encontrado.");
  if (method === "POST" && url === "/api/v1/benefits/movements") return benefits.createMovement(body<CreateEmployeeMovementInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/benefits\/movements\/([^/]+)\/decision$/))) return required(await benefits.decideMovement(match[1],body<{decision:"approve"|"reject"}>(options).decision),"Movimentação não encontrada.");

  if (method === "GET" && url === "/api/v1/special-calculations/overview") return special.overview();
  if (method === "POST" && url === "/api/v1/special-calculations/calculations") return special.create(body<CreateSpecialCalculationInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/special-calculations\/calculations\/([^/]+)\/exceptions\/([^/]+)\/resolve$/))) return required(await special.resolve(match[1],match[2]),"Exceção não encontrada.");
  if (method === "POST" && (match = url.match(/^\/api\/v1\/special-calculations\/calculations\/([^/]+)\/approve$/))) return required(await special.approve(match[1]),"Existem exceções abertas.");

  if (method === "GET" && url === "/api/v1/terminations/overview") return terminations.overview();
  if (method === "POST" && url === "/api/v1/terminations/processes") return terminations.create(body<CreateTerminationInput>(options));
  if (method === "POST" && (match = url.match(/^\/api\/v1\/terminations\/processes\/([^/]+)\/exceptions\/([^/]+)\/resolve$/))) return required(await terminations.resolve(match[1],match[2]),"Exceção não encontrada.");
  if (method === "POST" && (match = url.match(/^\/api\/v1\/terminations\/processes\/([^/]+)\/tasks\/([^/]+)\/toggle$/))) return required(await terminations.toggleTask(match[1],match[2]),"Tarefa bloqueada.");
  if (method === "POST" && (match = url.match(/^\/api\/v1\/terminations\/processes\/([^/]+)\/approve$/))) return required(await terminations.approve(match[1]),"Existem pendências abertas.");

  throw new Error(`Operação local não implementada: ${method} ${url}`);
}
