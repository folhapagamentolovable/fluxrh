import type { Employee } from "@fluxrh/contracts";
import { describe, expect, it } from "vitest";
import { filterEmployeeList } from "./employees.repository.js";

const employee = (index: number): Employee => ({
  id: `emp_${index}`, registration: String(index).padStart(6, "0"), fullName: `Colaborador ${index}`,
  cpf: "***.000.***-00", email: `employee${index}@example.test`, phone: "", birthDate: "1990-01-01",
  hireDate: "2020-01-01", status: index % 2 ? "active" : "vacation", companyId: "company_volume",
  companyName: "Empresa Volume", establishmentId: "est_1", establishmentName: "Matriz", departmentId: "dept_1",
  departmentName: "Operações", costCenterId: "cc_1", costCenterName: "Operações", position: "Analista",
  contractType: "CLT", salary: 3000, workSchedule: "Seg–Sex", managerName: "Gestor", avatarColor: "#155eef",
  documents: [], dependents: [], timeline: [],
});

describe("employee list at representative volume", () => {
  it("filters 10,000 records and returns only the requested bounded page", () => {
    const values = Array.from({ length: 10_000 }, (_, index) => employee(index));
    const page = filterEmployeeList(values, { query: "Colaborador", status: "active", offset: 100, limit: 50 });
    expect(page).toHaveLength(50);
    expect(page[0]?.status).toBe("active");
    expect("documents" in (page[0] ?? {})).toBe(false);
  });
});
