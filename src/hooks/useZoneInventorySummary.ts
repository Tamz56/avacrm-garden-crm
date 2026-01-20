// src/hooks/useZoneInventorySummary.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type ZoneInventorySummary = {
    zone_id: string;
    name: string;
    farm_name: string | null;
    area_rai: number | null;
    trees_in_plot_now: number;         // จำนวนต้นไม้ทั้งหมดที่ยังอยู่ในแปลง (จากระบบ)
    ready_for_sale_in_plot: number;    // ต้นพร้อมขายในแปลง
    latest_inspection_qty: number;     // จำนวนจากการสำรวจล่าสุด
    latest_inspection_date: string | null; // วันที่สำรวจล่าสุด
    inspection_diff_qty: number;       // ส่วนต่าง = สำรวจ - ระบบ
};

type HookState = {
    summary: ZoneInventorySummary | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
};

export function useZoneInventorySummary(zoneId?: string | null): HookState {
    const [summary, setSummary] = useState<ZoneInventorySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!zoneId) {
            setSummary(null);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
            .from("view_zone_inventory_and_inspection_summary")
            .select("*")
            .eq("zone_id", zoneId)
            .maybeSingle();

        if (err) {
            console.error("useZoneInventorySummary error", err);
            setError(err.message);
        } else {
            setSummary(data ?? null);
        }
        setLoading(false);
    }, [zoneId]);

    useEffect(() => {
        load();
    }, [load]);

    return { summary, loading, error, reload: load };
}
