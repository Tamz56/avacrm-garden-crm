// src/hooks/useDigOrderDetail.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

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

    species_name_th: string | null;
    species_name_en: string | null;
    zone_name: string | null;

    created_at: string;
};

type UseDigOrderDetailResult = {
    rows: DigOrderDetailRow[];
    loading: boolean;
    error: string | null;
};

export function useDigOrderDetail(orderId: string | null): UseDigOrderDetailResult {
    const [rows, setRows] = useState<DigOrderDetailRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setRows([]);
            return;
        }

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from("view_dig_order_detail")
                    .select("*")
                    .eq("order_id", orderId)
                    .order("tag_code", { ascending: true });

                if (error) throw error;
                if (!cancelled) setRows((data as unknown as DigOrderDetailRow[]) ?? []);
            } catch (err: any) {
                console.error("โหลดรายละเอียดใบคำสั่งขุดไม่สำเร็จ", err);
                if (!cancelled) setError(err.message ?? "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [orderId]);

    return { rows, loading, error };
}
