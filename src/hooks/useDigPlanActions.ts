import { useState } from "react";
import { supabase } from "../supabaseClient";

// RPC v2 response type
type RpcAddDigPlanItemV2Row = {
    ok: boolean;
    id?: string | null;
    error_code?: string | null;
    message?: string | null;
};

// CreateDigPlan input type (exported for external use)
export type CreateDigPlanInput = {
    zoneId: string;
    status?: "planned" | "in_progress" | "completed" | "cancelled";
    confidenceLevel?: "low" | "medium" | "high";
    planReason?: string | null;
    notes?: string | null;
    targetDateFrom?: string | null; // YYYY-MM-DD
    targetDateTo?: string | null;   // YYYY-MM-DD
};

export function useDigPlanActions() {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function addDigPlanItem(input: {
        planId: string;
        tagId: string;
        sizeLabel?: string | null;
        grade?: string | null;
        qty?: number;
        notes?: string | null;
    }): Promise<{ ok: boolean; message: string; itemId?: string }> {
        setWorking(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("add_dig_plan_item_v2", {
                p_plan_id: input.planId,
                p_tag_id: input.tagId,
                p_size_label: input.sizeLabel ?? null,
                p_grade: input.grade ?? null,
                p_qty: input.qty ?? 1,
                p_notes: input.notes ?? null,
            });

            // System error (permission/db down/network)
            if (error) {
                const msg = error.message || "เกิดข้อผิดพลาดของระบบ";
                setError(msg);
                return { ok: false, message: msg };
            }

            const row = (Array.isArray(data) ? data[0] : data) as RpcAddDigPlanItemV2Row | null;

            // Guard: empty data
            if (!row) {
                const msg = "ไม่พบผลลัพธ์จากระบบ (RPC v2)";
                setError(msg);
                return { ok: false, message: msg };
            }

            if (!row.ok) {
                const msg = row.message ?? "เพิ่มรายการไม่สำเร็จ";
                setError(msg);
                return { ok: false, message: msg };
            }

            // Success: v2 มักไม่ส่ง message (null) => ใส่ default
            return {
                ok: true,
                message: row.message ?? "เพิ่มรายการสำเร็จ",
                itemId: row.id ?? undefined, // ✅ Fixed: row.id not row.item_id
            };
        } finally {
            setWorking(false);
        }
    }

    async function promoteToZoneDigupOrder(input: {
        planId: string;
        digupDate: string;
        status?: string | null;
        notes?: string | null;
    }): Promise<{ ok: boolean; message: string; orderId?: string }> {
        setWorking(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("promote_dig_plan_to_zone_digup_order_v2", {
                p_plan_id: input.planId,
                p_digup_date: input.digupDate,
                p_status: input.status ?? "planned",
                p_notes: input.notes ?? null,
            });

            if (error) {
                const msg = error.message || "เกิดข้อผิดพลาดในการ Promote";
                setError(msg);
                return { ok: false, message: msg };
            }

            // v2 returns scalar uuid
            const orderId = (data ?? null) as unknown as string | null;
            if (!orderId) {
                const msg = "Promote ไม่สำเร็จ (ไม่ได้รับ order id)";
                setError(msg);
                return { ok: false, message: msg };
            }

            return { ok: true, message: "Promote สำเร็จ", orderId };
        } finally {
            setWorking(false);
        }
    }

    async function searchZoneTags(params: { zoneId: string; q: string }) {
        const { data, error } = await supabase.rpc("search_zone_tags_v1", {
            p_zone_id: params.zoneId,
            p_q: params.q,
            p_limit: 20,
        });
        if (error) throw error;
        return (data ?? []) as { id: string; tag_code: string }[];
    }

    // RPC v2 remove response type
    type RpcRemoveDigPlanItemV2Row = {
        ok: boolean;
        error_code?: string | null;
        message?: string | null;
    };

    async function removeDigPlanItem(input: {
        itemId: string;
        notes?: string | null;
    }): Promise<{ ok: boolean; message: string }> {
        setWorking(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("remove_dig_plan_item_v2", {
                p_item_id: input.itemId,
                p_notes: input.notes ?? null,
            });

            // System error (permission/db down/network)
            if (error) {
                const msg = error.message || "เกิดข้อผิดพลาดของระบบ";
                setError(msg);
                return { ok: false, message: msg };
            }

            const row = (Array.isArray(data) ? data[0] : data) as RpcRemoveDigPlanItemV2Row | null;

            // Guard: empty data
            if (!row) {
                const msg = "ไม่พบผลลัพธ์จากระบบ";
                setError(msg);
                return { ok: false, message: msg };
            }

            if (!row.ok) {
                const msg = row.message ?? "ลบรายการไม่สำเร็จ";
                setError(msg);
                return { ok: false, message: msg };
            }

            return { ok: true, message: row.message ?? "ลบรายการสำเร็จ" };
        } finally {
            setWorking(false);
        }
    }

    async function createDigPlan(input: {
        zoneId: string;
        status?: "planned" | "in_progress" | "completed" | "cancelled";
        confidenceLevel?: "low" | "medium" | "high";
        planReason?: string | null;
        notes?: string | null;
        targetDateFrom?: string | null;
        targetDateTo?: string | null;
    }): Promise<{ ok: boolean; message: string; planId?: string }> {
        setWorking(true);
        setError(null);

        try {
            const { data, error } = await supabase.rpc("create_dig_plan_v1", {
                p_zone_id: input.zoneId,
                p_status: input.status ?? "planned",
                p_confidence_level: input.confidenceLevel ?? "medium",
                p_plan_reason: input.planReason ?? null,
                p_notes: input.notes ?? null,
                p_target_date_from: input.targetDateFrom ?? null,
                p_target_date_to: input.targetDateTo ?? null,
            });

            if (error) {
                const msg = error.message || "สร้างแผนไม่สำเร็จ";
                setError(msg);
                return { ok: false, message: msg };
            }

            const row = Array.isArray(data) ? data[0] : data;
            if (!row?.ok) {
                const msg = row?.message ?? "สร้างแผนไม่สำเร็จ";
                setError(msg);
                return { ok: false, message: msg };
            }

            return { ok: true, message: row.message ?? "สร้างแผนสำเร็จ", planId: row.plan_id };
        } finally {
            setWorking(false);
        }
    }

    return { promoteToZoneDigupOrder, addDigPlanItem, removeDigPlanItem, createDigPlan, searchZoneTags, working, error };
}
