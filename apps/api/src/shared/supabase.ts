import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PersistenceMode = "memory" | "supabase";

export function getPersistenceMode(): PersistenceMode {
  return process.env.FLUXRH_PERSISTENCE === "supabase" ? "supabase" : "memory";
}

export function createRequestSupabaseClient(authorization?: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!url || !publishableKey) throw new Error("supabase_not_configured");
  if (!token) throw new Error("authentication_required");

  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function getCurrentOrganizationId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`organization_lookup_failed:${error.message}`);
  if (!data) throw new Error("organization_membership_required");
  return data.organization_id as string;
}
