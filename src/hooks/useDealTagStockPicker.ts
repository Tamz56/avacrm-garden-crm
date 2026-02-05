// src/hooks/useDealTagStockPicker.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient"; // ปรับ path ให้ตรงโปรเจกต์

export type DealTagStockPickerRow = {
    tag_id: string;
    tag_code: string;

    species_name_th: string | null;
    size_label: string | null;

    zone_id: string | null;
    zone_key: string | null;
    zone_name: string | null;

    status: string | null;         // แล้วแต่ view ของคุณมี field อะไร
    is_available: boolean | null;  // แล้วแต่ view ของคุณมี field อะไร

    unit_price: number | null;
    updated_at: string | null;
};

export type DealTagStockPickerFilter = {
    speciesNameTh?: string;
    sizeLabel?: string;
    zoneId?: string;
    onlyAvailable?: boolean; // default true
    limit?: number;          // default 200
};

export function useDealTagStockPicker(filter: DealTagStockPickerFilter = {}) {
    const {
        speciesNameTh,
        sizeLabel,
        zoneId,
        onlyAvailable = true,
        limit = 200,
    } = filter;

    const [rows, setRows] = useState<DealTagStockPickerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const key = useMemo(
        () => ({ speciesNameTh, sizeLabel, zoneId, onlyAvailable, limit }),
        [speciesNameTh, sizeLabel, zoneId, onlyAvailable, limit]
    );

    async function fetchData() {
        setLoading(true);
        setError(null);

        try {
            let q = supabase
                .from("view_deal_tag_stock_picker_v2")
                .select("*")
                .limit(limit);

            if (speciesNameTh) q = q.eq("species_name_th", speciesNameTh);
            if (sizeLabel) q = q.eq("size_label", sizeLabel);
            if (zoneId) q = q.eq("zone_id", zoneId);
            if (onlyAvailable) q = q.eq("is_available", true);

            q = q.order("updated_at", { ascending: false, nullsFirst: false });

            const { data, error } = await q;
            if (error) throw error;

            setRows((data ?? []) as DealTagStockPickerRow[]);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load deal tag stock picker");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key.speciesNameTh, key.sizeLabel, key.zoneId, key.onlyAvailable, key.limit]);

    return { rows, loading, error, refresh: fetchData };
}
