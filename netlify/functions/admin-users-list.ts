import type { Handler } from "@netlify/functions";
import { requireAdmin, json } from "./_auth";
import { supabaseAdmin } from "./_supabase";

export const handler: Handler = async (event) => {
    try {
        await requireAdmin(event);

        const admin = supabaseAdmin();
        const { data, error } = await admin
            .from("profiles")
            .select("id,email,full_name,role,updated_at,created_at")
            .order("updated_at", { ascending: false });

        if (error) return json(500, { error: error.message });
        return json(200, { data });
    } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        return json(err.statusCode || 500, { error: err.message || "Server error" });
    }
};
