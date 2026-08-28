import type { Employee } from "@fluxrh/contracts";

export const pilotScenario = {
  id: "pilot_internal_2026_08",
  organizationName: "Grupo Flux — Piloto interno",
  companyId: "company_flux",
  competence: "2026-08",
  establishments: ["est_sp", "est_santos"],
  posts: ["Posto Matriz", "Posto Santos", "Posto Logística"],
  schedules: ["Administrativo 5×2", "Operacional 12×36", "Tarde 6×1"],
  journeys: {
    admissions: 6,
    vacations: 8,
    medicalCertificates: 5,
    terminations: 3,
    intentionalExceptions: 12,
  },
} as const;

const firstNames = ["Alex", "Bruna", "Caio", "Diana", "Enzo", "Fabiana", "Guilherme", "Helena"];
const lastNames = ["Almeida", "Barros", "Campos", "Duarte", "Esteves", "Freitas", "Gomes", "Henrique"];

export function createPilotEmployees(count = 116): Employee[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 200;
    const establishment = index % 3 === 0 ? "est_santos" : "est_sp";
    const department = index % 5 === 0 ? "dept_people" : index % 4 === 0 ? "dept_fin" : "dept_ops";
    const status: Employee["status"] = index % 29 === 0 ? "terminated" : index % 23 === 0 ? "leave" : index % 19 === 0 ? "vacation" : index % 17 === 0 ? "onboarding" : "active";
    const schedule = index % 3 === 0 ? "Operacional 12×36 · 07:00–19:00" : index % 3 === 1 ? "Tarde 6×1 · 13:40–22:00" : "Administrativo 5×2 · 08:00–17:48";
    return {
      id: `pilot_emp_${String(number).padStart(4, "0")}`,
      registration: String(number).padStart(6, "0"),
      fullName: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]} Piloto ${number}`,
      cpf: `***.${String(number).padStart(3, "0")}.***-**`,
      email: `piloto.${number}@example.invalid`,
      phone: "(00) 00000-0000",
      birthDate: `${1980 + (index % 20)}-${String((index % 12) + 1).padStart(2, "0")}-15`,
      hireDate: `${2020 + (index % 6)}-${String((index % 12) + 1).padStart(2, "0")}-01`,
      status,
      companyId: "company_flux",
      companyName: "Grupo Flux",
      establishmentId: establishment,
      establishmentName: establishment === "est_sp" ? "Matriz São Paulo" : "Unidade Santos",
      departmentId: department,
      departmentName: department === "dept_people" ? "Pessoas e Cultura" : department === "dept_fin" ? "Financeiro" : "Operações",
      costCenterId: department === "dept_people" ? "cc_people" : "cc_ops",
      costCenterName: department === "dept_people" ? "RH Corporativo" : "Operação Matriz",
      position: index % 4 === 0 ? "Assistente" : index % 4 === 1 ? "Analista" : index % 4 === 2 ? "Agente operacional" : "Supervisor",
      contractType: "CLT",
      salary: 2200 + (index % 12) * 350,
      workSchedule: schedule,
      managerName: index % 2 === 0 ? "Daniel Costa" : "Marina Alves",
      avatarColor: ["#155eef", "#17a673", "#7a50c8", "#d28b16"][index % 4]!,
      documents: [],
      dependents: [],
      timeline: [{ id: `pilot_timeline_${number}`, title: "Incluído no piloto interno", description: "Registro sintético e sem dados pessoais reais.", occurredAt: "2026-08-01T12:00:00.000Z", category: "Piloto" }],
    };
  });
}
