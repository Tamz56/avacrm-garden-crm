import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, serviceKey, {
        auth: { persistSession: false },
    });
}

export function supabaseAnon() {
    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_ANON_KEY!;
    return createClient(url, anon, {
        auth: { persistSession: false },
    });
}
