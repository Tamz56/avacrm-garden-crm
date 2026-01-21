import type { HandlerEvent } from "@netlify/functions";
import { supabaseAnon, supabaseAdmin } from "./_supabase";

export type Authed = {
    uid: string;
    email: string | null;
};

function getBearer(event: HandlerEvent) {
    const h = event.headers.authorization || event.headers.Authorization;
    if (!h) return null;
    const m = String(h).match(/^Bearer\s+(.+)$/i);
    return m?.[1] ?? null;
}

export async function requireAdmin(event: HandlerEvent): Promise<Authed> {
    const token = getBearer(event);
    if (!token) throw Object.assign(new Error("Missing Bearer token"), { statusCode: 401 });

    // ตรวจสอบ token ด้วย anon client
    const anon = supabaseAnon();
    const { data: u, error: uErr } = await anon.auth.getUser(token);
    if (uErr || !u?.user) throw Object.assign(new Error("Invalid session"), { statusCode: 401 });

    const uid = u.user.id;
    const email = u.user.email ?? null;

    // เช็ค role ใน profiles ด้วย service role
    const admin = supabaseAdmin();
    const { data: p, error: pErr } = await admin
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

    if (pErr) throw Object.assign(new Error("Failed to check role"), { statusCode: 500 });
    if (!p || p.role !== "admin") throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

    return { uid, email };
}

export function json(statusCode: number, body: unknown) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}
