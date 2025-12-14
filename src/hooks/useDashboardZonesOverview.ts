// src/hooks/useDashboardZonesOverview.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DashboardZoneOverview = {
    id: string;
    name: string;
    farm_name: string | null;
    // ตัวเลขจาก view_zone_overview
    total_tagged: number | null;
    total_remaining_for_tag: number | null;
    last_inspection_date: string | null;

    // 🆕 main species / size ของโซน
    main_species_name_th: string | null;
    main_size_label: string | null;
};

export function useDashboardZonesOverview() {
    const [data, setData] = useState<DashboardZoneOverview[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        // เรียก 2 view พร้อมกัน
        const [zonesRes, lifecycleRes] = await Promise.all([
            supabase
                .from("view_zone_overview")
                .select(
                    `
                    id,
                    name,
                    farm_name,
                    total_tagged,
                    total_remaining_for_tag,
                    inspection_date
                    `
                )
                .order("name", { ascending: true }),

            supabase
                .from("view_stock_zone_lifecycle")
                .select(
                    `
                    zone_id,
                    species_name_th,
                    size_label,
                    tagged_total_qty
                    `
                ),
        ]);

        if (zonesRes.error) {
            console.error("load zones overview error", zonesRes.error);
            setError(zonesRes.error.message);
            setData([]);
            setLoading(false);
            return;
        }

        if (lifecycleRes.error) {
            console.error("load zone lifecycle error", lifecycleRes.error);
            // lifecycle error ไม่ถึงกับ fail ทั้งหมด แต่แจ้งไว้
        }

        const zonesData = zonesRes.data ?? [];
        const lifecycleRows = lifecycleRes.data ?? [];

        // 🧠 เลือก main species / size ต่อ zone (เอาแถวที่มี total_qty สูงสุด)
        type MainInfo = {
            species_name_th: string | null;
            size_label: string | null;
            score: number;
        };

        const mainByZone = new Map<string, MainInfo>();

        for (const row of lifecycleRows as any[]) {
            const zoneId = row.zone_id as string;
            const qty = (row.tagged_total_qty ?? 0) as number;   // ใช้ tagged_total_qty
            const current = mainByZone.get(zoneId);

            if (!current || qty > current.score) {
                mainByZone.set(zoneId, {
                    species_name_th: row.species_name_th ?? null,
                    size_label: row.size_label ?? null,
                    score: qty,
                });
            }
        }

        // map กลับเป็น state สำหรับ Dashboard
        setData(
            (zonesData as any[]).map((z) => {
                const main = mainByZone.get(z.id);

                return {
                    id: z.id,
                    name: z.name,
                    farm_name: z.farm_name,
                    total_tagged: z.total_tagged,
                    total_remaining_for_tag: z.total_remaining_for_tag,
                    last_inspection_date: z.inspection_date ?? null,

                    main_species_name_th: main?.species_name_th ?? null,
                    main_size_label: main?.size_label ?? null,
                } as DashboardZoneOverview;
            })
        );

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

