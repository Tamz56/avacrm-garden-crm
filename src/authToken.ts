// src/authToken.ts
import type { SupabaseClient } from "@supabase/supabase-js";

let accessToken: string | null = null;

export function getAccessToken() {
    return accessToken;
}

export async function initAuthToken(supabase: SupabaseClient) {
    // Get initial session
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token ?? null;

    // Listen for changes
    supabase.auth.onAuthStateChange((event, session) => {

        accessToken = session?.access_token ?? null;
    });
}

export function clearAccessToken() {
    accessToken = null;
}
