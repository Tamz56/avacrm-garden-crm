import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export type DigPlan = {
    id: string;
    zone_id: string;
    status: "planned" | "in_progress" | "completed" | "cancelled";
    target_date_from: string | null;
    target_date_to: string | null;
    plan_reason: string | null;
    confidence_level: "low" | "medium" | "high";
    notes: string | null;

    // NEW canonical linkage
    promoted_order_id: string | null;
    promoted_at: string | null;
    promoted_by: string | null;

    created_at: string;
    updated_at: string | null;
};

export type DigPlanItem = {
    id: string;
    plan_id: string;
    tag_id: string;
    size_label: string | null;
    grade: string | null;
    qty: number;
    is_active: boolean;
    created_at: string;
    tag_code: string | null;
    notes?: string | null;
};

export type ZoneDigPlanSummaryRow = {
    zone_id: string;
    planned_qty: number | null;
    planned_tags: number | null;
};

export type DigPlanKpi = {
    planned: number;
    in_progress: number;
    linked_orders: number;
    pending_promote: number;
};

export function useZoneDigPlans(zoneId: string | null) {
    const [plans, setPlans] = useState<DigPlan[]>([]);
    const [itemsByPlan, setItemsByPlan] = useState<Record<string, DigPlanItem[]>>({});
    const [summary, setSummary] = useState<ZoneDigPlanSummaryRow[]>([]);
    const [kpi, setKpi] = useState<DigPlanKpi>({
        planned: 0,
        in_progress: 0,
        linked_orders: 0,
        pending_promote: 0,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // -----------------------
    // Helpers
    // -----------------------
    const totals = useMemo(() => {
        const plannedQtyTotal = (summary ?? []).reduce(
            (sum, r) => sum + (r.planned_qty ?? 0),
            0
        );
        const plannedTagsTotal = (summary ?? []).reduce(
            (sum, r) => sum + (r.planned_tags ?? 0),
            0
        );
        return {
            plannedQtyTotal,
            plannedTagsTotal,
        };
    }, [summary]);

    // -----------------------
    // Queries
    // -----------------------
    async function fetchPlans() {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("dig_plans")
                .select("*")
                .eq("zone_id", zoneId)
                .is("promoted_order_id", null)
                .order("created_at", { ascending: false });

            if (error) {
                setError(error.message);
                return;
            }

            setPlans((data as any) ?? []);
        } finally {
            setLoading(false);
        }
    }

    async function fetchItems(planId: string) {
        const { data, error } = await supabase
            .from("dig_plan_items")
            .select(
                "id, plan_id, tag_id, size_label, grade, qty, is_active, notes, created_at, tree_tags(tag_code)"
            )
            .eq("plan_id", planId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) {
            setError(error.message);
            return;
        }

        const items = (data ?? []).map((row: any) => ({
            ...row,
            tag_code: row.tree_tags?.tag_code ?? null,
        }));

        setItemsByPlan((prev) => ({ ...prev, [planId]: items as DigPlanItem[] }));
    }

    async function fetchSummary() {
        if (!zoneId) return;

        const { data, error } = await supabase
            .from("view_zone_dig_plan_summary")
            .select("*")
            .eq("zone_id", zoneId);

        if (error) {
            console.warn("fetchSummary error:", error.message);
            return;
        }

        setSummary((data as any) ?? []);
    }

    async function fetchKpi() {
        if (!zoneId) return;

        const plannedQ = supabase
            .from("dig_plans")
            .select("id", { count: "exact", head: true })
            .eq("zone_id", zoneId)
            .eq("status", "planned")
            .is("promoted_order_id", null);

        const inProgressQ = supabase
            .from("dig_plans")
            .select("id", { count: "exact", head: true })
            .eq("zone_id", zoneId)
            .eq("status", "in_progress")
            .is("promoted_order_id", null);

        const linkedQ = supabase
            .from("dig_plans")
            .select("id", { count: "exact", head: true })
            .eq("zone_id", zoneId)
            .not("promoted_order_id", "is", null);

        const [plannedRes, inProgressRes, linkedRes] = await Promise.all([
            plannedQ,
            inProgressQ,
            linkedQ,
        ]);

        const err = plannedRes.error || inProgressRes.error || linkedRes.error;
        if (err) {
            console.error("fetchKpi error:", err.message);
            return;
        }

        const planned = plannedRes.count ?? 0;
        const in_progress = inProgressRes.count ?? 0;
        const linked_orders = linkedRes.count ?? 0;
        const pending_promote = planned + in_progress;

        setKpi({ planned, in_progress, linked_orders, pending_promote });
    }

    // -----------------------
    // Refetch API (Promise.all for speed)
    // -----------------------
    async function refetchPlans() {
        if (!zoneId) return;
        setError(null);
        setLoading(true);
        try {
            await Promise.all([fetchPlans(), fetchSummary(), fetchKpi()]);
        } finally {
            setLoading(false);
        }
    }

    async function refetchSummary() {
        await fetchSummary();
    }

    async function refetchKpi() {
        await fetchKpi();
    }

    // -----------------------
    // Initial load
    // -----------------------
    useEffect(() => {
        if (!zoneId) return;
        refetchPlans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    return {
        plans,
        itemsByPlan,
        summary,
        kpi,
        loading,
        error,
        refetchPlans,
        refetchSummary,
        refetchKpi,
        fetchItems,
        totals,
    };
}
