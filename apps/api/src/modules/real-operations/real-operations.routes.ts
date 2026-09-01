import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { sendData } from "../../shared/http.js";
import { createRequestSupabaseClient, getCurrentOrganizationId, getPersistenceMode } from "../../shared/supabase.js";

const checklistSchema = z.object({
  termsApproved: z.literal(true),
  ownersNamed: z.literal(true),
  accessReviewed: z.literal(true),
  backupVerified: z.literal(true),
  rollbackTested: z.literal(true),
  dataInventoryApproved: z.literal(true),
  humanReviewerNamed: z.literal(true),
});

const prepareSchema = z.object({
  competence: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  title: z.string().trim().min(5).max(160),
  scope: z.array(z.enum(["employees", "time_tracking", "absences", "benefits", "payroll_preview"])).min(1),
  humanReviewer: z.string().trim().min(3).max(120),
  rollbackPlan: z.string().trim().min(20).max(4000),
  checklist: checklistSchema,
});

const approveSchema = z.object({ approvalNote: z.string().trim().min(10).max(2000) });
const evidenceSchema = z.object({
  kind: z.enum(["input", "comparison", "decision", "audit", "rollback"]),
  label: z.string().trim().min(3).max(160),
  reference: z.string().trim().min(3).max(2000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
});

function unavailable(reply: FastifyReply) {
  return reply.code(503).send({ error: "real_cycle_requires_supabase_persistence" });
}

export async function realOperationsRoutes(app: FastifyInstance) {
  app.get("/cycles", async (request, reply) => {
    if (getPersistenceMode() !== "supabase") return unavailable(reply);
    const client = createRequestSupabaseClient(request.headers.authorization);
    const organizationId = await getCurrentOrganizationId(client);
    const { data, error } = await client.from("controlled_real_cycles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) return reply.code(422).send({ error: error.message });
    return sendData(reply, data ?? []);
  });

  app.post("/cycles", async (request, reply) => {
    if (getPersistenceMode() !== "supabase") return unavailable(reply);
    const parsed = prepareSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    const client = createRequestSupabaseClient(request.headers.authorization);
    const { data, error } = await client.rpc("prepare_controlled_real_cycle", {
      competence_value: `${parsed.data.competence}-01`, title_value: parsed.data.title,
      scope_value: parsed.data.scope, human_reviewer_value: parsed.data.humanReviewer,
      rollback_plan_value: parsed.data.rollbackPlan, checklist_value: parsed.data.checklist,
    });
    if (error) return reply.code(422).send({ error: error.message });
    return sendData(reply, { id: data }, 201);
  });

  app.post<{ Params: { id: string } }>("/cycles/:id/approve", async (request, reply) => {
    if (getPersistenceMode() !== "supabase") return unavailable(reply);
    const parsed = approveSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    const client = createRequestSupabaseClient(request.headers.authorization);
    const { error } = await client.rpc("approve_controlled_real_cycle", { cycle_id_value: request.params.id, approval_note_value: parsed.data.approvalNote });
    if (error) return reply.code(422).send({ error: error.message });
    return sendData(reply, { id: request.params.id, status: "approved" });
  });

  app.post<{ Params: { id: string } }>("/cycles/:id/evidence", async (request, reply) => {
    if (getPersistenceMode() !== "supabase") return unavailable(reply);
    const parsed = evidenceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "validation_error", issues: parsed.error.issues });
    const client = createRequestSupabaseClient(request.headers.authorization);
    const { data, error } = await client.rpc("append_controlled_cycle_evidence", {
      cycle_id_value: request.params.id, kind_value: parsed.data.kind, label_value: parsed.data.label,
      reference_value: parsed.data.reference, sha256_value: parsed.data.sha256 ?? null,
    });
    if (error) return reply.code(422).send({ error: error.message });
    return sendData(reply, { id: data }, 201);
  });
}
