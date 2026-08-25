// Re-export the singleton client to avoid multiple GoTrueClient instances.
// All Supabase usage must go through the shared instance in lib/supabase.ts.
export { supabase } from '../../../lib/supabase';
