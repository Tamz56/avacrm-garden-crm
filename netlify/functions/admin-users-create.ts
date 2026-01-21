import type { Handler } from "@netlify/functions";
import { requireAdmin, json } from "./_auth";
import { supabaseAdmin } from "./_supabase";

type Body = {
    email: string;
    password: string;
    full_name?: string;
    role?: "admin" | "staff" | "viewer";
    auto_confirm?: boolean;
};

export const handler: Handler = async (event) => {
    try {
        await requireAdmin(event);

        if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
        const body = (event.body ? JSON.parse(event.body) : {}) as Body;

        if (!body.email || !body.password) return json(400, { error: "email/password required" });

        const admin = supabaseAdmin();

        // 1) Create Auth user
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: body.auto_confirm ?? true,
        });

        if (cErr || !created?.user) return json(500, { error: cErr?.message || "Create user failed" });

        const uid = created.user.id;

        // 2) Upsert profile (มาตรฐาน: profiles.id = uid)
        const profile = {
            id: uid,
            email: body.email,
            full_name: body.full_name ?? null,
            role: body.role ?? "staff",
            updated_at: new Date().toISOString(),
        };

        const { error: pErr } = await admin
            .from("profiles")
            .upsert(profile, { onConflict: "id" });

        if (pErr) return json(500, { error: pErr.message });

        return json(200, { ok: true, uid });
    } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        return json(err.statusCode || 500, { error: err.message || "Server error" });
    }
};
