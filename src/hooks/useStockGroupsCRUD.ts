// src/hooks/useStockGroupsCRUD.ts
import { useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { StockGroup } from "./useStockGroups";

type StockGroupInput = {
    zone_key?: string;
    plot_key?: string;
    species_name_th?: string;
    species_name_en?: string;
    size_label?: string;
    qty_total: number;
};

export function useStockGroupsCRUD() {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState<any>(null);

    // Create new stock group
    const create = useCallback(async (input: StockGroupInput): Promise<StockGroup | null> => {
        setSaving(true);
        setError(null);

        const { data, error } = await supabase
            .from("stock_groups")
            .insert({
                zone_key: input.zone_key || null,
                plot_key: input.plot_key || null,
                species_name_th: input.species_name_th || null,
                species_name_en: input.species_name_en || null,
                size_label: input.size_label || null,
                qty_total: input.qty_total,
                qty_reserved: 0,
                qty_available: input.qty_total,
            })
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error("Error creating stock group:", error);
            setError(error);
            return null;
        }

        return data as StockGroup;
    }, []);

    // Update existing stock group
    const update = useCallback(async (id: string, input: Partial<StockGroupInput>): Promise<StockGroup | null> => {
        setSaving(true);
        setError(null);

        // If qty_total is updated, recalculate qty_available
        const updateData: any = { ...input };
        if (input.qty_total !== undefined) {
            // Need to fetch current qty_reserved to calculate new qty_available
            const { data: current } = await supabase
                .from("stock_groups")
                .select("qty_reserved")
                .eq("id", id)
                .single();

            if (current) {
                updateData.qty_available = Math.max(input.qty_total - (current.qty_reserved || 0), 0);
            }
        }

        const { data, error } = await supabase
            .from("stock_groups")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        setSaving(false);

        if (error) {
            console.error("Error updating stock group:", error);
            setError(error);
            return null;
        }

        return data as StockGroup;
    }, []);

    // Delete stock group
    const remove = useCallback(async (id: string): Promise<boolean> => {
        setDeleting(id);
        setError(null);

        const { error } = await supabase
            .from("stock_groups")
            .delete()
            .eq("id", id);

        setDeleting(null);

        if (error) {
            console.error("Error deleting stock group:", error);
            setError(error);
            return false;
        }

        return true;
    }, []);

    return {
        create,
        update,
        remove,
        saving,
        deleting,
        error,
        clearError: () => setError(null),
    };
}
