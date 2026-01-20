// src/fetch.ts
import { getAccessToken } from "./authToken";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL!;
const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY!;

/**
 * Enhanced fetch utility for Supabase REST API
 * @param path API path (e.g. /rest/v1/table)
 * @param init Request init options
 * @param options { requireAuth: boolean } - if true (default), throws error if no token is available
 */
export async function apiFetch(
    path: string,
    init: RequestInit = {},
    options: { requireAuth?: boolean } = { requireAuth: true }
) {
    const token = getAccessToken();

    if (options.requireAuth && !token) {
        throw new Error("API Authentication required: No access token available.");
    }

    const headers = new Headers(init.headers);
    headers.set("apikey", ANON);

    // Authorization uses user's token if available, otherwise falls back to anon key 
    // (if requireAuth is false)
    headers.set("Authorization", `Bearer ${token ?? ANON}`);
    headers.set("Content-Type", "application/json");

    // Ensure path starts with /
    const urlPath = path.startsWith("/") ? path : `/${path}`;

    const res = await fetch(`${SUPABASE_URL}${urlPath}`, {
        ...init,
        headers,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
    }

    return res;
}
