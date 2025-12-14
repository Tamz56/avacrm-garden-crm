import { useState } from "react";
import { supabase } from "../supabaseClient";

export interface StockItemPayload {
    species_id?: string;
    zone_id?: string;
    size_label?: string;
    trunk_size_inch?: number | null;
    pot_size_inch?: number | null;
    height_text?: string | null;
    ready_date?: string | null;
    quantity_available?: number;
    base_price?: number | null;
    status?: string;
    is_active?: boolean;
}

export function useStockUpdate() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createStockItem = async (payload: StockItemPayload) => {
        setSaving(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("stock_items")
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            console.error("Error creating stock item:", err);
            setError(err.message);
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const updateStockItem = async (id: string, payload: StockItemPayload) => {
        setSaving(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("stock_items")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            console.error("Error updating stock item:", err);
            setError(err.message);
            throw err;
        } finally {
            setSaving(false);
        }
    };

    return { createStockItem, updateStockItem, saving, error };
}
