import { createClient } from "@supabase/supabase-js";
import { InMemoryEmployeesRepository } from "../modules/employees/employees.repository.js";
import { pilotScenario } from "./pilot-scenario.js";

const MAIN_PROJECT_ID = "akdmobvbombhqvvglayn";
const MAIN_SUPABASE_URL = `https://${MAIN_PROJECT_ID}.supabase.co`;

export type PilotLoadPayload = {
  scenarioId: string;
  version: number;
  competence: string;
  company: { legalName: string; tradeName: string; document: string };
  units: Array<{ code: string; name: string; type: "establishment" | "department" | "cost_center" }>;
  schedules: Array<{ name: string; pattern: string; startTime: string; endTime: string; breakMinutes: number; weeklyHours: number }>;
  employees: Array<{
    registration: string; fullName: string; cpf: string; email?: string; phone?: string; birthDate?: string;
    status: string; establishmentCode: string; departmentCode: string; costCenterCode: string; position: string;
    contractType: string; salary: number; workSchedule: string; hireDate: string; scheduleName: string;
  }>;
  patrolState: { posts: typeof pilotScenario.posts; assignments: typeof pilotScenario.employeeAssignments };
};

export async function buildPilotLoadPayload(): Promise<PilotLoadPayload> {
  const repository = new InMemoryEmployeesRepository();
  const assignmentByEmployee = new Map(pilotScenario.employeeAssignments.map((item) => [item.employeeId, item]));
  const employees = (await repository.list({ limit: pilotScenario.company.employeeTarget + 10 }))
    .filter((employee) => assignmentByEmployee.has(employee.id))
    .map((employee) => {
      const assignment = assignmentByEmployee.get(employee.id)!;
      const schedule = pilotScenario.schedules.find((item) => item.id === assignment.scheduleId)!;
      return {
        registration: employee.registration, fullName: employee.fullName, cpf: employee.cpf,
        email: employee.email, phone: employee.phone, birthDate: employee.birthDate, status: employee.status,
        establishmentCode: assignment.establishmentId, departmentCode: employee.departmentId,
        costCenterCode: employee.costCenterId, position: employee.position, contractType: employee.contractType,
        salary: employee.salary, workSchedule: schedule.label, hireDate: employee.hireDate, scheduleName: schedule.name,
      };
    });

  if (employees.length !== pilotScenario.company.employeeTarget) throw new Error(`pilot_employee_count_invalid:${employees.length}`);
  return {
    scenarioId: pilotScenario.id, version: pilotScenario.version, competence: pilotScenario.competence,
    company: { legalName: pilotScenario.company.legalName, tradeName: pilotScenario.company.tradeName, document: "00.000.000/0001-23" },
    units: [
      ...pilotScenario.establishments.map((item) => ({ code: item.id, name: item.name, type: "establishment" as const })),
      { code: "dept_people", name: "Pessoas e Cultura", type: "department" },
      { code: "dept_fin", name: "Financeiro", type: "department" },
      { code: "dept_ops", name: "Operações", type: "department" },
      { code: "cc_people", name: "RH Corporativo", type: "cost_center" },
      { code: "cc_ops", name: "Operação Matriz", type: "cost_center" },
    ],
    schedules: [
      { name: "Administrativo 5×2", pattern: "5x2", startTime: "08:00", endTime: "17:48", breakMinutes: 60, weeklyHours: 44 },
      { name: "Operacional 12×36", pattern: "12x36", startTime: "07:00", endTime: "19:00", breakMinutes: 60, weeklyHours: 42 },
      { name: "Tarde 6×1", pattern: "6x1", startTime: "13:40", endTime: "22:00", breakMinutes: 60, weeklyHours: 44 },
    ],
    employees,
    patrolState: { posts: pilotScenario.posts, assignments: pilotScenario.employeeAssignments },
  };
}

export async function loadPilotIntoMainSupabase(configuration: {
  organizationId: string; publishableKey: string; accessToken?: string; email?: string; password?: string;
}) {
  const client = createClient(MAIN_SUPABASE_URL, configuration.publishableKey, configuration.accessToken
    ? { accessToken: async () => configuration.accessToken! }
    : { auth: { persistSession: false, autoRefreshToken: false } });
  if (configuration.accessToken) {
    const { error } = await client.auth.getUser(configuration.accessToken);
    if (error) throw new Error(`pilot_authentication_failed:${error.message}`);
  } else {
    if (!configuration.email || !configuration.password) throw new Error("pilot_credentials_missing");
    const { error } = await client.auth.signInWithPassword({ email: configuration.email, password: configuration.password });
    if (error) throw new Error(`pilot_authentication_failed:${error.message}`);
  }
  const payload = await buildPilotLoadPayload();
  const { data, error } = await client.rpc("load_internal_pilot", { target_organization_id: configuration.organizationId, pilot_payload: payload });
  if (error) throw new Error(`pilot_load_failed:${error.message}`);
  return data;
}

export { MAIN_PROJECT_ID, MAIN_SUPABASE_URL };
