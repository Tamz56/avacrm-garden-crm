// src/hooks/useZoneDigupOrderWorkflow.ts
// Hook for zone digup order workflow tracking - ใช้ view_zone_digup_order_detail_v1

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import type { TreeTagStatus } from "../lib/treeTagWorkflow";

export type ZoneDigupWorkflowRow = {
    zone_digup_order_id: string;
    zone_id: string | null;
    zone_name: string | null;

    digup_date: string | null;
    order_status: string | null;
    order_qty: number | null;
    order_notes: string | null;
    order_created_at: string | null;
    source_plan_id: string | null;

    item_id: string;
    tag_id: string;
    item_qty: number | null;

    tag_code: string | null;
    tag_status: TreeTagStatus | null;
    tag_grade: string | null;
    tag_size_label: string | null;

    planting_row: string | number | null;
    planting_position: string | number | null;

    tag_species_name_th: string | null;
    tag_species_name_en: string | null;
};

export type ZoneDigupOrderSummary = {
    id: string;                  // zone_digup_order_id
    zone_id: string | null;
    zone_name: string | null;
    digup_date: string | null;
    status: string | null;       // order_status
    qty: number;                 // sum item_qty (fallback count)
    notes: string | null;
    source_plan_id: string | null;
    created_at: string | null;
};

export type WorkflowRow = {
    tag_id: string;
    tag_code: string | null;
    status: TreeTagStatus;
    size_label: string | null;
    grade: string | null;
};

type UseZoneDigupOrderWorkflowResult = {
    orders: ZoneDigupOrderSummary[];
    rowsByOrderId: Record<string, ZoneDigupWorkflowRow[]>;
    workflowRowsByOrderId: Record<string, WorkflowRow[]>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useZoneDigupOrderWorkflow(zoneId: string | null): UseZoneDigupOrderWorkflowResult {
    const [rows, setRows] = useState<ZoneDigupWorkflowRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRows = useCallback(async () => {
        if (!zoneId) {
            setRows([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("view_zone_digup_order_detail_v1")
                .select("*")
                .eq("zone_id", zoneId)
                .order("order_created_at", { ascending: false })
                .order("tag_code", { ascending: true });

            if (error) throw error;
            setRows((data ?? []) as ZoneDigupWorkflowRow[]);
        } catch (err: any) {
            console.error("โหลด Zone Digup Orders ไม่สำเร็จ", err);
            setError(err.message ?? "โหลดข้อมูลไม่สำเร็จ");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [zoneId]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    // Group rows by order_id
    const rowsByOrderId = useMemo(() => {
        const map: Record<string, ZoneDigupWorkflowRow[]> = {};
        for (const r of rows) {
            (map[r.zone_digup_order_id] ||= []).push(r);
        }
        return map;
    }, [rows]);

    // Derive workflow rows for DigupWorkflowTracker
    const workflowRowsByOrderId = useMemo(() => {
        const map: Record<string, WorkflowRow[]> = {};
        for (const [orderId, orderRows] of Object.entries(rowsByOrderId)) {
            map[orderId] = orderRows
                .filter((r) => r.tag_id && r.tag_status)
                .map((r) => ({
                    tag_id: r.tag_id,
                    tag_code: r.tag_code,
                    status: r.tag_status as TreeTagStatus,
                    size_label: r.tag_size_label,
                    grade: r.tag_grade,
                }));
        }
        return map;
    }, [rowsByOrderId]);

    // Build orders summary from grouped rows
    const orders: ZoneDigupOrderSummary[] = useMemo(() => {
        const map: Record<string, ZoneDigupOrderSummary> = {};

        for (const r of rows) {
            const id = r.zone_digup_order_id;
            if (!map[id]) {
                map[id] = {
                    id,
                    zone_id: r.zone_id,
                    zone_name: r.zone_name,
                    digup_date: r.digup_date,
                    status: r.order_status,
                    qty: 0,
                    notes: r.order_notes,
                    source_plan_id: r.source_plan_id,
                    created_at: r.order_created_at,
                };
            }
            // qty: ใช้ item_qty ถ้ามี ไม่งั้นนับเป็น 1
            map[id].qty += (r.item_qty ?? 1);
        }

        // Sort by created_at descending
        return Object.values(map).sort((a, b) => {
            const ta = a.created_at ? Date.parse(a.created_at) : 0;
            const tb = b.created_at ? Date.parse(b.created_at) : 0;
            return tb - ta;
        });
    }, [rows]);

    return {
        orders,
        rowsByOrderId,
        workflowRowsByOrderId,
        loading,
        error,
        refetch: fetchRows,
    };
}
