import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// V2 Credentials for Parallel Run
const supabaseUrlV2 = import.meta.env.VITE_SUPABASE_URL_V2;
const supabaseAnonKeyV2 = import.meta.env.VITE_SUPABASE_ANON_KEY_V2;

export const IS_OFFLINE = supabaseUrl.includes("placeholder");

if (import.meta.env.PROD && IS_OFFLINE) {
  throw new Error(
    "PRODUCTION BUILD ERROR: Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

// Initialize both clients
export const supabaseV1 = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export const supabaseV2 = supabaseUrlV2 && supabaseAnonKeyV2
  ? createClient(supabaseUrlV2, supabaseAnonKeyV2, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : supabaseV1;

// Dynamic proxy to switch backend database on the fly without changing UI code.
// Switch via F12 console: localStorage.setItem('motocare_use_v2', 'true'); location.reload();
export const supabase = new Proxy({} as any, {
  get(target, prop, receiver) {
    const useV2 = localStorage.getItem("motocare_use_v2") === "true";
    const activeClient = useV2 && supabaseUrlV2 ? supabaseV2 : supabaseV1;
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === "function") {
      return value.bind(activeClient);
    }
    return value;
  }
});
