import type { Handler } from "@netlify/functions";
import { requireAdmin, json } from "./_auth";
import { supabaseAdmin } from "./_supabase";

type Body = {
    id: string; // uid
    full_name?: string | null;
    role?: "admin" | "staff" | "viewer" | null;
};

export const handler: Handler = async (event) => {
    try {
        await requireAdmin(event);

        if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
        const body = (event.body ? JSON.parse(event.body) : {}) as Body;

        if (!body.id) return json(400, { error: "id required" });

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if ("full_name" in body) patch.full_name = body.full_name;
        if ("role" in body) patch.role = body.role;

        const admin = supabaseAdmin();
        const { error } = await admin.from("profiles").update(patch).eq("id", body.id);
        if (error) return json(500, { error: error.message });

        return json(200, { ok: true });
    } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        return json(err.statusCode || 500, { error: err.message || "Server error" });
    }
};
