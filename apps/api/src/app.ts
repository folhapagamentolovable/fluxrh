import cors from "@fastify/cors";
import Fastify from "fastify";
import { operationsRoutes } from "./modules/operations/operations.routes.js";
import { organizationsRoutes } from "./modules/organizations/organizations.routes.js";
import { employeesRoutes } from "./modules/employees/employees.routes.js";
import { workflowsRoutes } from "./modules/workflows/workflows.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { timeRoutes } from "./modules/time-tracking/time.routes.js";
import { absencesRoutes } from "./modules/absences/absences.routes.js";
import { payrollRoutes } from "./modules/payroll/payroll.routes.js";
import { benefitsRoutes } from "./modules/benefits/benefits.routes.js";
import { specialCalculationRoutes } from "./modules/special-calculations/special.routes.js";
import { terminationRoutes } from "./modules/terminations/termination.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });
  app.get("/health", async () => ({ status: "ok", service: "fluxrh-api" }));
  app.register(operationsRoutes, { prefix: "/api/v1/operations" });
  app.register(organizationsRoutes, { prefix: "/api/v1/organizations" });
  app.register(employeesRoutes, { prefix: "/api/v1/employees" });
  app.register(workflowsRoutes, { prefix: "/api/v1/workflows" });
  app.register(documentsRoutes, { prefix: "/api/v1/documents" });
  app.register(timeRoutes, { prefix: "/api/v1/time" });
  app.register(absencesRoutes, { prefix: "/api/v1/absences" });
  app.register(payrollRoutes, { prefix: "/api/v1/payroll" });
  app.register(benefitsRoutes, { prefix: "/api/v1/benefits" });
  app.register(specialCalculationRoutes, { prefix: "/api/v1/special-calculations" });
  app.register(terminationRoutes, { prefix: "/api/v1/terminations" });
  return app;
}
