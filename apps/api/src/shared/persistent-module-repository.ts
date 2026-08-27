import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentOrganizationId } from "./supabase.js";

type JsonObject = Record<string, unknown>;

interface HydratableRepository {
  hydrate(state: JsonObject): void;
  overview(...args: unknown[]): Promise<object>;
}

const queues = new Map<string, Promise<void>>();

async function exclusively<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  queues.set(key, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (queues.get(key) === queued) queues.delete(key);
  }
}

async function loadState(
  client: SupabaseClient,
  organizationId: string,
  moduleName: string,
): Promise<{ state?: JsonObject; version: number }> {
  const { data, error } = await client
    .from("module_repository_states")
    .select("state,version")
    .eq("organization_id", organizationId)
    .eq("module_name", moduleName)
    .maybeSingle();
  if (error)
    throw new Error(`${moduleName}_state_load_failed:${error.message}`);
  return data
    ? { state: data.state as JsonObject, version: Number(data.version) }
    : { version: 0 };
}

async function saveState(
  client: SupabaseClient,
  organizationId: string,
  moduleName: string,
  state: JsonObject,
  version: number,
): Promise<void> {
  const { error } = await client.rpc("save_module_repository_state", {
    organization_id_value: organizationId,
    module_name_value: moduleName,
    state_value: state,
    expected_version_value: version,
  });
  if (error)
    throw new Error(`${moduleName}_state_save_failed:${error.message}`);
}

export function createPersistentModuleRepository<T extends object>(
  client: SupabaseClient,
  moduleName: string,
  factory: () => T,
): T {
  return new Proxy({} as T, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return async (...args: unknown[]) => {
        const organizationId = await getCurrentOrganizationId(client);
        return exclusively(`${organizationId}:${moduleName}`, async () => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const repository = factory() as T & HydratableRepository;
            const loaded = await loadState(client, organizationId, moduleName);
            if (loaded.state) repository.hydrate(structuredClone(loaded.state));

            const method = repository[property as keyof T];
            if (typeof method !== "function")
              throw new Error(`${moduleName}_method_not_found:${property}`);
            const result = await (
              method as (...values: unknown[]) => Promise<unknown>
            ).apply(repository, args);

            if (property === "overview" && loaded.state) return result;

            try {
              const snapshot = (await repository.overview()) as JsonObject;
              await saveState(
                client,
                organizationId,
                moduleName,
                snapshot,
                loaded.version,
              );
              return result;
            } catch (error) {
              const conflict = error instanceof Error && error.message.includes("module_state_conflict");
              if (!conflict || attempt === 1) throw error;
            }
          }
          throw new Error(`${moduleName}_state_retry_exhausted`);
        });
      };
    },
  });
}
