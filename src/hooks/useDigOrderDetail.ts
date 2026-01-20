// src/hooks/useDigOrderDetail.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import type { TreeTagStatus } from "../lib/treeTagWorkflow";

export type DigOrderDetailRow = {
    order_id: string;
    code: string;
    status: string;
    scheduled_date: string | null;
    notes: string | null;

    deal_id: string;
    deal_title: string;
    customer_name: string;

    tag_id: string;
    tag_code: string;
    size_label: string | null;
    qty: number | null;
    planting_row: number | null;
    planting_position: number | null;
    tag_notes: string | null;
    tag_status: TreeTagStatus | null;
    grade: string | null;

    species_name_th: string | null;
    species_name_en: string | null;
    zone_name: string | null;

    created_at: string;
};

export type WorkflowRow = {
    tag_id: string;
    tag_code: string;
    status: TreeTagStatus;
    size_label: string | null;
    grade: string | null;
};

type UseDigOrderDetailResult = {
    rows: DigOrderDetailRow[];
    workflowRows: WorkflowRow[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

export function useDigOrderDetail(orderId: string | null): UseDigOrderDetailResult {
    const [rows, setRows] = useState<DigOrderDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!orderId) {
            setRows([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("view_dig_order_detail")
                .select("*")
                .eq("order_id", orderId)
                .order("tag_code", { ascending: true });

            if (error) throw error;
            setRows((data as unknown as DigOrderDetailRow[]) ?? []);
        } catch (err: any) {
            console.error("โหลดรายละเอียดใบคำสั่งขุดไม่สำเร็จ", err);
            setError(err.message ?? "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        load();
    }, [load]);

    // Derive workflow rows from rows data
    const workflowRows: WorkflowRow[] = rows
        .filter((r) => r.tag_id && r.tag_status)
        .map((r) => ({
            tag_id: r.tag_id,
            tag_code: r.tag_code,
            status: r.tag_status as TreeTagStatus,
            size_label: r.size_label,
            grade: r.grade,
        }));

    return { rows, workflowRows, loading, error, refetch: load };
}
