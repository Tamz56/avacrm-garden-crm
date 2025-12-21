import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type DigPlan = {
    id: string;
    zone_id: string;
    status: "draft" | "active" | "cancelled" | "completed";
    target_date_from: string | null;
    target_date_to: string | null;
    plan_reason: string | null;
    confidence_level: "low" | "medium" | "high";
    notes: string | null;
    zone_digup_order_id: string | null;
    created_at: string;
    updated_at: string | null;
};

export type DigPlanItem = {
    id: string;
    plan_id: string;
    tag_id: string;
    species_id: string | null;
    size_label: string | null;
    grade: string | null;
    qty: number;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type ZoneDigPlanSummaryRow = {
    zone_id: string;
    planned_tags: number;
    planned_qty: number;
    min_target_from: string | null;
    max_target_to: string | null;
};

export function useZoneDigPlans(zoneId?: string) {
    const [plans, setPlans] = useState<DigPlan[]>([]);
    const [itemsByPlan, setItemsByPlan] = useState<Record<string, DigPlanItem[]>>({});
    const [summary, setSummary] = useState<ZoneDigPlanSummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchPlans() {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("dig_plans")
            .select("*")
            .eq("zone_id", zoneId)
            .order("created_at", { ascending: false });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }
        setPlans((data as any) ?? []);
        setLoading(false);
    }

    async function fetchItems(planId: string) {
        const { data, error } = await supabase
            .from("dig_plan_items")
            .select("*")
            .eq("plan_id", planId)
            .order("created_at", { ascending: false });

        if (error) {
            setError(error.message);
            return;
        }
        setItemsByPlan((prev) => ({ ...prev, [planId]: ((data as any) ?? []) }));
    }

    async function fetchSummary() {
        if (!zoneId) return;

        const { data, error } = await supabase
            .from("view_zone_dig_plan_summary")
            .select("*")
            .eq("zone_id", zoneId);

        if (error) {
            console.warn("fetchSummary error:", error);
            return;
        }
        setSummary((data as any) ?? []);
    }

    useEffect(() => {
        fetchPlans();
        fetchSummary();
    }, [zoneId]);

    const totals = useMemo(() => {
        const plannedQty = Object.values(itemsByPlan)
            .flat()
            .filter((x) => x.is_active)
            .reduce((sum, x) => sum + (x.qty ?? 1), 0);
        return { plannedQty };
    }, [itemsByPlan]);

    return {
        plans,
        itemsByPlan,
        summary,
        loading,
        error,
        refetchPlans: async () => {
            await fetchPlans();
            await fetchSummary();
        },
        fetchItems,
        totals,
    };
}
