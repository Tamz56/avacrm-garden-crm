import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DigPlanStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface DigPlan {
    id: string;
    code: string;
    zone_id: string | null;
    zone_name?: string;
    plot_id: string | null;
    species_id: string | null;
    species_name?: string;
    size_label: string | null;
    qty: number;
    digup_date: string | null;
    expected_ready_date: string | null;
    status: DigPlanStatus;
    notes: string | null;
    deal_id: string | null;
    deal_code?: string;
    deal_item_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface UseDigPlansOptions {
    status?: DigPlanStatus | null;
    zone_id?: string | null;
}

export function useDigPlans(options: UseDigPlansOptions = {}) {
    const [plans, setPlans] = useState<DigPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from("dig_plans")
                .select(`
                    *,
                    stock_zones(name),
                    stock_species(name),
                    deals(deal_code)
                `)
                .order("created_at", { ascending: false });

            if (options.status) {
                query = query.eq("status", options.status);
            }
            if (options.zone_id) {
                query = query.eq("zone_id", options.zone_id);
            }

            const { data, error: err } = await query;

            if (err) throw err;

            // Map response to include names
            const mapped = (data || []).map((row: any) => ({
                ...row,
                zone_name: row.stock_zones?.name || null,
                species_name: row.stock_species?.name || null,
                deal_code: row.deals?.deal_code || null,
            }));

            setPlans(mapped);
        } catch (err: any) {
            console.error("useDigPlans error:", err);
            setError(err.message || "Failed to load dig plans");
        } finally {
            setLoading(false);
        }
    }, [options.status, options.zone_id]);

    useEffect(() => {
        load();
    }, [load]);

    // Update status
    const updateStatus = async (planId: string, newStatus: DigPlanStatus, notes?: string) => {
        try {
            const updates: Record<string, any> = { status: newStatus };
            if (notes !== undefined) {
                updates.notes = notes;
            }

            const { error: err } = await supabase
                .from("dig_plans")
                .update(updates)
                .eq("id", planId);

            if (err) throw err;

            // Refresh
            await load();
            return { ok: true };
        } catch (err: any) {
            return { ok: false, error: err.message };
        }
    };

    return {
        plans,
        loading,
        error,
        reload: load,
        updateStatus,
    };
}
