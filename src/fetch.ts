// src/fetch.ts
import { getAccessToken } from "./authToken";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL!;
const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export async function apiFetch(path: string, init: RequestInit = {}) {
    const token = getAccessToken(); // null if not logged in

    const headers = new Headers(init.headers);
    headers.set("apikey", ANON);
    // Authorization uses user's token if available, otherwise falls back to anon key
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
