import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseServiceClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false
      }
    }
  );
}

export function getSupabaseAnonClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false
      }
    }
  );
}
