import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export interface SpeciesStockAndPlotsRow {
    species_id: string;
    species_name_th: string | null;
    species_name_en: string | null;
    species_code: string | null;
    size_label: string | null;

    total_stock_trees: number;
    available_trees: number;
    reserved_trees: number;
    shipped_trees: number;

    planted_in_plots: number;
}

interface UseSpeciesStockAndPlotsResult {
    rows: SpeciesStockAndPlotsRow[];
    loading: boolean;
    error: string | null;
}

/**
 * ดึงข้อมูลจาก view: view_species_stock_and_plots
 * รวม stock + จำนวนที่ปลูกในแปลงตาม species / size
 */
export const useSpeciesStockAndPlots = (): UseSpeciesStockAndPlotsResult => {
    const [rows, setRows] = useState<SpeciesStockAndPlotsRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("view_species_stock_and_plots")
                .select("*")
                .order("species_name_th", { ascending: true })
                .order("size_label", { ascending: true });

            if (cancelled) return;

            if (error) {
                console.error("Error loading view_species_stock_and_plots:", error);
                setError(error.message ?? "โหลดข้อมูลไม่สำเร็จ");
                setRows([]);
            } else {
                setRows(data as SpeciesStockAndPlotsRow[] || []);
            }

            setLoading(false);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { rows, loading, error };
};
