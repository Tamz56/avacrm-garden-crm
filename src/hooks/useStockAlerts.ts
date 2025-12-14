// src/hooks/useStockAlerts.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type StockAlertRow = {
    alert_type: "over_reserved" | "no_available" | "low_stock" | "has_dig_order" | string;
    alert_severity: number;
    alert_message: string;

    zone_id: string;
    zone_name: string;
    farm_name: string;
    plot_type: string | null;

    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;

    size_label: string | null;
    height_label: string | null;

    grade_id: string | null;
    grade_name: string | null;
    grade_code: string | null;

    total_qty: number;
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;
};

export type StockAlertFilters = {
    farmName?: string;
    plotTypeId?: string;   // uuid ของประเภทแปลง ถ้าใช้
    speciesId?: string;
};

export type StockAlertSummary = {
    totalAlerts: number;
    criticalCount: number; // severity 3
    warningCount: number;  // severity 2
    infoCount: number;     // severity 1
};

export function useStockAlerts(filters: StockAlertFilters = {}) {
    const [rows, setRows] = useState<StockAlertRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { farmName, plotTypeId, speciesId } = filters;

            const { data, error } = await supabase.rpc("get_stock_alerts", {
                p_farm_name: farmName ?? null,
                p_plot_type: plotTypeId ?? null,
                p_species_id: speciesId ?? null,
            });

            if (cancelled) return;

            if (error) {
                console.error("get_stock_alerts error:", error);
                setError(error.message);
                setRows([]);
            } else {
                setRows((data ?? []) as StockAlertRow[]);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [filters.farmName, filters.plotTypeId, filters.speciesId]);

    const summary: StockAlertSummary = useMemo(() => {
        if (!rows.length) {
            return {
                totalAlerts: 0,
                criticalCount: 0,
                warningCount: 0,
                infoCount: 0,
            };
        }

        let critical = 0;
        let warning = 0;
        let info = 0;

        for (const r of rows) {
            if (r.alert_severity >= 3) critical++;
            else if (r.alert_severity === 2) warning++;
            else info++;
        }

        return {
            totalAlerts: rows.length,
            criticalCount: critical,
            warningCount: warning,
            infoCount: info,
        };
    }, [rows]);

    return { rows, loading, error, summary };
}
