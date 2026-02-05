// src/hooks/useDealTagStockPickerTotals.ts
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // ปรับ path ให้ตรงโปรเจกต์

export type DealTagStockPickerTotalsRow = {
    species_name_th: string | null;
    size_label: string | null;
    qty_total: number | null;
    qty_available: number | null;
    qty_reserved: number | null;
    updated_at: string | null;
};

export function useDealTagStockPickerTotalsV2() {
    const [rows, setRows] = useState<DealTagStockPickerTotalsRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchData() {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("view_deal_tag_stock_picker_totals_v2")
                .select("*")
                .order("species_name_th", { ascending: true })
                .order("size_label", { ascending: true });

            if (error) throw error;
            setRows((data ?? []) as DealTagStockPickerTotalsRow[]);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load stock picker totals");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    return { rows, loading, error, refresh: fetchData };
}
