import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useDigFromPlot() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const digFromPlot = async (params: {
        plotTreeId: string;
        digCount: number;
        zoneId: string;
        digDate: string; // ISO date string
    }) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc("dig_trees_from_plot", {
                _plot_tree_id: params.plotTreeId,
                _dig_count: params.digCount,
                _zone_id: params.zoneId,
                _dig_date: params.digDate,
            });

            if (error) throw error;
            return data;
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "เกิดข้อผิดพลาดในการล้อมต้นเข้า Stock");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { digFromPlot, loading, error };
}
