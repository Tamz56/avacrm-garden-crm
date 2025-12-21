import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useDigPlanActions() {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function promoteToZoneDigupOrder(planId: string, digupDate?: string) {
        setWorking(true);
        setError(null);

        const { data, error } = await supabase.rpc("promote_dig_plan_to_zone_digup_order_v1", {
            p_plan_id: planId,
            p_digup_date: digupDate ?? null,
            p_status: "planned",
            p_notes: "Promote from UI",
        });

        if (error) {
            setError(error.message);
            setWorking(false);
            throw error;
        }

        setWorking(false);
        return data as string; // zone_digup_order_id
    }

    return { promoteToZoneDigupOrder, working, error };
}
