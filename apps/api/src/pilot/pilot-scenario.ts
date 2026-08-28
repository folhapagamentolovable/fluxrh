import type { Employee } from "@fluxrh/contracts";

export type PilotEstablishment = { id: string; name: string; city: string; state: string; employeeTarget: number };
export type PilotPost = { id: string; name: string; establishmentId: string };
export type PilotSchedule = { id: "schedule_5x2" | "schedule_12x36" | "schedule_6x1"; name: string; label: string };
export type PilotJourney = "admission" | "vacation" | "medical_certificate" | "termination" | "intentional_exception";
export type PilotEmployeeAssignment = {
  employeeId: string;
  establishmentId: string;
  postId: string;
  scheduleId: PilotSchedule["id"];
  journeys: PilotJourney[];
};
export type PilotScenario = {
  id: string; version: number; seed: string; competence: string;
  organization: { id: string; name: string };
  company: { id: string; legalName: string; tradeName: string; employeeTarget: number };
  existingEmployeeIds: readonly string[];
  establishments: readonly PilotEstablishment[];
  posts: readonly PilotPost[];
  schedules: readonly PilotSchedule[];
  employeeAssignments: PilotEmployeeAssignment[];
  journeys: { admissions: number; vacations: number; medicalCertificates: number; terminations: number; intentionalExceptions: number };
  syntheticEmployees: Employee[];
};

const firstNames = ["Alex", "Bruna", "Caio", "Diana", "Enzo", "Fabiana", "Guilherme", "Helena"];
const lastNames = ["Almeida", "Barros", "Campos", "Duarte", "Esteves", "Freitas", "Gomes", "Henrique"];
const existingEmployeeIds = ["emp_marina", "emp_carlos", "emp_beatriz", "emp_rafael"] as const;
const establishments: readonly PilotEstablishment[] = [
  { id: "est_sp", name: "Matriz São Paulo", city: "São Paulo", state: "SP", employeeTarget: 80 },
  { id: "est_santos", name: "Unidade Santos", city: "Santos", state: "SP", employeeTarget: 40 },
];
const posts: readonly PilotPost[] = [
  { id: "post_matriz", name: "Posto Matriz", establishmentId: "est_sp" },
  { id: "post_logistica", name: "Posto Logística", establishmentId: "est_sp" },
  { id: "post_santos", name: "Posto Santos", establishmentId: "est_santos" },
];
const schedules: readonly PilotSchedule[] = [
  { id: "schedule_5x2", name: "Administrativo 5×2", label: "Administrativo 5×2 · 08:00–17:48" },
  { id: "schedule_12x36", name: "Operacional 12×36", label: "Operacional 12×36 · 07:00–19:00" },
  { id: "schedule_6x1", name: "Tarde 6×1", label: "Tarde 6×1 · 13:40–22:00" },
];

function generateSyntheticEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 200;
    const establishment = establishments[index % 3 === 0 ? 1 : 0]!;
    const department = index % 5 === 0 ? "dept_people" : index % 4 === 0 ? "dept_fin" : "dept_ops";
    const status: Employee["status"] = index % 29 === 0 ? "terminated" : index % 23 === 0 ? "leave" : index % 19 === 0 ? "vacation" : index % 17 === 0 ? "onboarding" : "active";
    const schedule = schedules[index % schedules.length]!;
    return {
      id: `pilot_emp_${String(number).padStart(4, "0")}`, registration: String(number).padStart(6, "0"),
      fullName: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]} Piloto ${number}`,
      cpf: `***.${String(number).padStart(3, "0")}.***-**`, email: `piloto.${number}@example.invalid`, phone: "(00) 00000-0000",
      birthDate: `${1980 + (index % 20)}-${String((index % 12) + 1).padStart(2, "0")}-15`, hireDate: `${2020 + (index % 6)}-${String((index % 12) + 1).padStart(2, "0")}-01`, status,
      companyId: "company_flux", companyName: "Grupo Flux", establishmentId: establishment.id, establishmentName: establishment.name,
      departmentId: department, departmentName: department === "dept_people" ? "Pessoas e Cultura" : department === "dept_fin" ? "Financeiro" : "Operações",
      costCenterId: department === "dept_people" ? "cc_people" : "cc_ops", costCenterName: department === "dept_people" ? "RH Corporativo" : "Operação Matriz",
      position: index % 4 === 0 ? "Assistente" : index % 4 === 1 ? "Analista" : index % 4 === 2 ? "Agente operacional" : "Supervisor",
      contractType: "CLT", salary: 2200 + (index % 12) * 350, workSchedule: schedule.label,
      managerName: index % 2 === 0 ? "Daniel Costa" : "Marina Alves", avatarColor: ["#155eef", "#17a673", "#7a50c8", "#d28b16"][index % 4]!,
      documents: [], dependents: [], timeline: [{ id: `pilot_timeline_${number}`, title: "Incluído no piloto interno", description: "Registro sintético e sem dados pessoais reais.", occurredAt: "2026-08-01T12:00:00.000Z", category: "Piloto" }],
    };
  });
}

export function createPilotScenario(): PilotScenario {
  const employeeTarget = 120;
  const syntheticEmployees = generateSyntheticEmployees(employeeTarget - existingEmployeeIds.length);
  const employeeIds = [...existingEmployeeIds, ...syntheticEmployees.map((employee) => employee.id)];
  const employeeAssignments = employeeIds.map((employeeId, index): PilotEmployeeAssignment => {
    const establishment = establishments[index < establishments[0]!.employeeTarget ? 0 : 1]!;
    const availablePosts = posts.filter((post) => post.establishmentId === establishment.id);
    const syntheticIndex = index - existingEmployeeIds.length;
    const journeys: PilotJourney[] = [];
    if (syntheticIndex >= 0 && syntheticIndex < 6) journeys.push("admission");
    if (syntheticIndex >= 6 && syntheticIndex < 14) journeys.push("vacation");
    if (syntheticIndex >= 14 && syntheticIndex < 19) journeys.push("medical_certificate");
    if (syntheticIndex >= 19 && syntheticIndex < 22) journeys.push("termination");
    if (syntheticIndex >= 0 && syntheticIndex < 12) journeys.push("intentional_exception");
    return { employeeId, establishmentId: establishment.id, postId: availablePosts[index % availablePosts.length]!.id, scheduleId: schedules[index % schedules.length]!.id, journeys };
  });
  const assignmentByEmployee = new Map(employeeAssignments.map((assignment) => [assignment.employeeId, assignment]));
  const normalizedEmployees = syntheticEmployees.map((employee) => {
    const assignment = assignmentByEmployee.get(employee.id)!;
    const establishment = establishments.find((value) => value.id === assignment.establishmentId)!;
    const schedule = schedules.find((value) => value.id === assignment.scheduleId)!;
    const status: Employee["status"] = assignment.journeys.includes("admission") ? "onboarding" : assignment.journeys.includes("vacation") ? "vacation" : assignment.journeys.includes("termination") ? "terminated" : employee.status;
    return { ...employee, establishmentId: establishment.id, establishmentName: establishment.name, workSchedule: schedule.label, status };
  });
  return {
    id: "pilot_internal_2026_08", version: 1, seed: "fluxrh-pilot-2026-08-v1", competence: "2026-08",
    organization: { id: "organization_flux", name: "Grupo Flux — Piloto interno" },
    company: { id: "company_flux", legalName: "Flux Serviços Empresariais Ltda.", tradeName: "Grupo Flux", employeeTarget },
    existingEmployeeIds, establishments, posts, schedules, employeeAssignments,
    journeys: { admissions: 6, vacations: 8, medicalCertificates: 5, terminations: 3, intentionalExceptions: 12 },
    syntheticEmployees: normalizedEmployees,
  };
}

export const pilotScenario = createPilotScenario();
export function createPilotEmployees(): Employee[] { return structuredClone(pilotScenario.syntheticEmployees); }
