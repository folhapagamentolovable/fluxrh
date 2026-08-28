import { loadPilotIntoMainSupabase } from "./pilot-loader.js";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`missing_environment_variable:${name}`);
  return value;
};

const result = await loadPilotIntoMainSupabase({
  organizationId: required("FLUXRH_PILOT_ORGANIZATION_ID"),
  publishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
  accessToken: process.env.FLUXRH_PILOT_ACCESS_TOKEN?.trim(),
  email: process.env.FLUXRH_PILOT_EMAIL?.trim(),
  password: process.env.FLUXRH_PILOT_PASSWORD,
});

console.log(JSON.stringify(result, null, 2));
