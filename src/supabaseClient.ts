// src/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY");
}

// กัน HMR/หลาย import สร้างหลาย instance
declare global {
  interface Window {
    __ava_supabase__?: SupabaseClient;
    supabase?: SupabaseClient; // optional: expose for dev
  }
}

export const supabase: SupabaseClient =
  window.__ava_supabase__ ??
  (window.__ava_supabase__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "avafarm888-auth", // ตั้งชื่อเฉพาะกันชนกับแอปอื่น
      storage: window.localStorage,
    },
  }));

// (แนะนำ) เปิดให้เรียกใน Console เฉพาะตอน dev
if (process.env.NODE_ENV === "development") {
  window.supabase = supabase;
}
