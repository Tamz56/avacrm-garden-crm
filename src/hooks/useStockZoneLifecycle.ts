import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type StockZoneLifecycleRow = {
    zone_id: string;
    zone_name: string;
    farm_name: string;
    plot_type: string | null;

    species_id: string;
    species_name_th: string;
    species_name_en: string | null;
    species_code: string | null;
    measure_by_height?: boolean;

    size_label: string;
    // Note: height_label and grade_id removed - use view_tree_tag_lifecycle_breakdown for drill-down

    // Stock quantities
    stock_total_qty: number;    // = inventory_qty (ต้นทั้งหมดใน stock)
    tagged_qty: number;         // = tagged_total_qty (ติด Tag แล้ว)
    untagged_qty: number;       // = ยังไม่ Tag

    // Legacy alias
    total_qty: number;
    inventory_qty?: number;

    // Tag status breakdown
    available_qty: number;
    reserved_qty: number;
    dig_ordered_qty: number;
    dug_qty: number;
    shipped_qty: number;
    planted_qty: number;

    // Workflow status breakdown
    selected_for_dig_qty: number;
    root_prune_qty: number;
    ready_to_lift_qty: number;
    rehab_qty: number;
    dead_qty: number;

    dig_ordered_to_panel_qty: number;
    dig_ordered_to_customer_qty: number;
    dug_to_panel_qty: number;
    dug_to_customer_qty: number;
};

export type StockZoneLifecycleFilter = {
    zoneId?: string;
    speciesId?: string;
    sizeLabel?: string;
    plotType?: string;
};


export function useStockZoneLifecycle(filter: StockZoneLifecycleFilter = {}) {
    const [rows, setRows] = useState<StockZoneLifecycleRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const reload = () => setReloadTrigger(t => t + 1);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            let query = supabase
                .from("view_stock_zone_lifecycle")
                .select(`
                    *,
                    dig_ordered_to_panel_qty,
                    dig_ordered_to_customer_qty,
                    dug_to_panel_qty,
                    dug_to_customer_qty
                `);

            if (filter.zoneId) {
                query = query.eq("zone_id", filter.zoneId);
            }
            if (filter.speciesId) {
                query = query.eq("species_id", filter.speciesId);
            }
            if (filter.sizeLabel) {
                query = query.eq("size_label", filter.sizeLabel);
            }
            if (filter.plotType) {
                query = query.eq("plot_type", filter.plotType);
            }

            const { data, error } = await query;

            if (cancelled) return;

            if (error) {
                console.error("load stock zone lifecycle error", error);
                setError(error.message);
                setRows([]);
            } else {
                // Map view columns to new type structure
                const mapped = (data || []).map((row: any) => ({
                    ...row,
                    // New columns
                    stock_total_qty: Number(row.inventory_qty ?? 0),
                    tagged_qty: Number(row.tagged_total_qty ?? 0),
                    untagged_qty: Number(row.untagged_qty ?? 0),
                    // Legacy alias for backward compatibility
                    total_qty: Number(row.inventory_qty ?? row.tagged_total_qty ?? 0),
                })) as unknown as StockZoneLifecycleRow[];
                setRows(mapped);
            }

            setLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [filter.zoneId, filter.speciesId, filter.sizeLabel, filter.plotType, reloadTrigger]);

    // KPI รวมด้านบน
    const kpi = useMemo(() => {
        const totals = {
            total: 0,
            available: 0,
            reserved: 0,
            digOrdered: 0,
            dug: 0,
            shipped: 0,
            planted: 0,
        };
        for (const r of rows) {
            totals.total += Number(r.total_qty ?? 0);
            totals.available += Number(r.available_qty ?? 0);
            totals.reserved += Number(r.reserved_qty ?? 0);
            totals.digOrdered += Number(r.dig_ordered_qty ?? 0);
            totals.dug += Number(r.dug_qty ?? 0);
            totals.shipped += Number(r.shipped_qty ?? 0);
            totals.planted += Number(r.planted_qty ?? 0);
        }
        return totals;
    }, [rows]);

    return { rows, kpi, loading, error, reload };
}

