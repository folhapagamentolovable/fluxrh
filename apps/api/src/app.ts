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
import { portalRoutes } from "./modules/portal/portal.routes.js";
import { communicationsRoutes } from "./modules/communications/communications.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { occupationalHealthRoutes } from "./modules/occupational-health/occupational.routes.js";
import { patrolsRoutes } from "./modules/patrols/patrols.routes.js";
import { governanceRoutes } from "./modules/governance/governance.routes.js";
import { filesRoutes } from "./modules/files/files.routes.js";
import { peopleRoutes } from "./modules/people/people.routes.js";
import { integrationsRoutes } from "./modules/integrations/integrations.routes.js";
import {
  registerApiSecurity,
  resolveAllowedOrigins,
  type ApiSecurityOptions,
} from "./shared/security.js";
import { getPersistenceMode } from "./shared/supabase.js";
import { registerOperationalGate } from "./shared/operational-gate.js";

export function buildApp(securityOptions: ApiSecurityOptions = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576,
    logger: {
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.set-cookie",
        ],
        censor: "[REDACTED]",
      },
    },
  });
  const allowedOrigins = resolveAllowedOrigins(securityOptions.allowedOrigins);
  app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      const error = new Error("origin_not_allowed") as Error & {
        statusCode: number;
      };
      error.statusCode = 403;
      return callback(error, false);
    },
  });
  registerApiSecurity(app, securityOptions);
  registerOperationalGate(app);
  app.get("/health", async () => ({ status: "ok", service: "fluxrh-api" }));
  app.get("/ready", async (_request, reply) => {
    const persistence = getPersistenceMode();
    const supabaseConfigured = Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    const ready = persistence === "supabase" && supabaseConfigured;

    return reply.code(ready ? 200 : 503).send({
      status: ready ? "ready" : "not_ready",
      service: "fluxrh-api",
      persistence,
      supabaseConfigured,
    });
  });
  app.register(operationsRoutes, { prefix: "/api/v1/operations" });
  app.register(organizationsRoutes, { prefix: "/api/v1/organizations" });
  app.register(employeesRoutes, { prefix: "/api/v1/employees" });
  app.register(workflowsRoutes, { prefix: "/api/v1/workflows" });
  app.register(documentsRoutes, { prefix: "/api/v1/documents" });
  app.register(timeRoutes, { prefix: "/api/v1/time" });
  app.register(absencesRoutes, { prefix: "/api/v1/absences" });
  app.register(payrollRoutes, { prefix: "/api/v1/payroll" });
  app.register(benefitsRoutes, { prefix: "/api/v1/benefits" });
  app.register(specialCalculationRoutes, {
    prefix: "/api/v1/special-calculations",
  });
  app.register(terminationRoutes, { prefix: "/api/v1/terminations" });
  app.register(portalRoutes, { prefix: "/api/v1/portal" });
  app.register(communicationsRoutes, { prefix: "/api/v1/communications" });
  app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
  app.register(occupationalHealthRoutes, {
    prefix: "/api/v1/occupational-health",
  });
  app.register(patrolsRoutes, { prefix: "/api/v1/patrols" });
  app.register(governanceRoutes, { prefix: "/api/v1/governance" });
  app.register(filesRoutes, { prefix: "/api/v1/files" });
  app.register(peopleRoutes, { prefix: "/api/v1/people" });
  app.register(integrationsRoutes, { prefix: "/api/v1/integrations" });
  return app;
}
