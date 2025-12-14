// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL / ANON KEY ยังไม่ถูกตั้งค่าใน .env.local (REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
