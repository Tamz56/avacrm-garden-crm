// src/hooks/useZoneLifecycleOverview.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type ZoneLifecycleRow = {
    zone_id: string;
    zone_name: string;
    farm_name: string;
    plot_type: string;

    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;
    measure_by_height: boolean | null;

    size_label: string | null;
    height_label: string | null;

    grade_id: string | null;
    grade_name: string | null;
    grade_code: string | null;

    total_qty: number;  // mapped from tagged_total_qty
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
};

export type ZoneLifecycleFilters = {
    farmName?: string;
    plotType?: string;
    speciesId?: string;
    sizeLabel?: string;
    gradeId?: string;
};

export type ZoneLifecycleTotals = {
    zones: number;
    total_qty: number;
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
};

export function useZoneLifecycleOverview(filters: ZoneLifecycleFilters = {}) {
    const [rows, setRows] = useState<ZoneLifecycleRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { farmName, plotType, speciesId, sizeLabel, gradeId } = filters;

            const { data, error } = await supabase.rpc("get_zone_lifecycle", {
                p_farm_name: farmName ?? null,
                p_plot_type: plotType ?? null,
                p_species_id: speciesId ?? null,
                p_size_label: sizeLabel ?? null,
                p_grade_id: gradeId ?? null,
            });

            if (cancelled) return;

            if (error) {
                console.error("get_zone_lifecycle error:", error);
                setError(error.message);
                setRows([]);
            } else {
                // Map tagged_total_qty to total_qty for frontend compatibility
                const mapped = (data ?? []).map((row: any) => ({
                    ...row,
                    total_qty: row.tagged_total_qty ?? row.total_qty ?? 0,
                })) as ZoneLifecycleRow[];
                setRows(mapped);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [
        filters.farmName,
        filters.plotType,
        filters.speciesId,
        filters.sizeLabel,
        filters.gradeId,
    ]);

    const totals: ZoneLifecycleTotals = useMemo(() => {
        if (!rows.length) {
            return {
                zones: 0,
                total_qty: 0,
                available_qty: 0,
                reserved_qty: 0,
                dig_ordered_qty: 0,
                dug_qty: 0,
                shipped_qty: 0,
                planted_qty: 0,
            };
        }

        return {
            zones: new Set(rows.map((r) => r.zone_id)).size,
            total_qty: rows.reduce((sum, r) => sum + Number(r.total_qty ?? 0), 0),
            available_qty: rows.reduce((sum, r) => sum + Number(r.available_qty ?? 0), 0),
            reserved_qty: rows.reduce((sum, r) => sum + Number(r.reserved_qty ?? 0), 0),
            dig_ordered_qty: rows.reduce((sum, r) => sum + Number(r.dig_ordered_qty ?? 0), 0),
            dug_qty: rows.reduce((sum, r) => sum + Number(r.dug_qty ?? 0), 0),
            shipped_qty: rows.reduce((sum, r) => sum + Number(r.shipped_qty ?? 0), 0),
            planted_qty: rows.reduce((sum, r) => sum + Number(r.planted_qty ?? 0), 0),
        };
    }, [rows]);

    return { rows, loading, error, totals };
}

/**
 * Hook สำหรับดึง lifecycle เฉพาะโซนเดียว โดยใช้ view ตรง ๆ
 * เหมาะใช้ในหน้า Zone Detail
 */
export function useZoneLifecycleByZoneId(zoneId?: string | null) {
    const [rows, setRows] = useState<ZoneLifecycleRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!zoneId) {
            setRows([]);
            return;
        }

        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("view_stock_zone_lifecycle")
                .select("*")
                .eq("zone_id", zoneId);

            if (cancelled) return;

            if (error) {
                console.error("view_stock_zone_lifecycle error:", error);
                setError(error.message);
                setRows([]);
            } else {
                setRows((data ?? []) as ZoneLifecycleRow[]);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [zoneId]);

    const totals: ZoneLifecycleTotals = useMemo(() => {
        if (!rows.length) {
            return {
                zones: 0,
                total_qty: 0,
                available_qty: 0,
                reserved_qty: 0,
                dig_ordered_qty: 0,
                dug_qty: 0,
                shipped_qty: 0,
                planted_qty: 0,
            };
        }

        return {
            zones: 1,
            total_qty: rows.reduce((sum, r) => sum + (r.total_qty ?? 0), 0),
            available_qty: rows.reduce((sum, r) => sum + (r.available_qty ?? 0), 0),
            reserved_qty: rows.reduce((sum, r) => sum + (r.reserved_qty ?? 0), 0),
            dig_ordered_qty: rows.reduce((sum, r) => sum + (r.dig_ordered_qty ?? 0), 0),
            dug_qty: rows.reduce((sum, r) => sum + (r.dug_qty ?? 0), 0),
            shipped_qty: rows.reduce((sum, r) => sum + (r.shipped_qty ?? 0), 0),
            planted_qty: rows.reduce((sum, r) => sum + (r.planted_qty ?? 0), 0),
        };
    }, [rows]);

    return { rows, loading, error, totals };
}
