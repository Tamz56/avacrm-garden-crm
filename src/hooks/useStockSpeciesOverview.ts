import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { SpeciesStockBlock } from "../types/stockSpecies";

export type StockSpeciesFilter = {
    speciesId?: string;
    sizeLabel?: string;
    heightLabel?: string;
    gradeId?: string;
    onlyAvailable?: boolean;
    hideUntaggedOnly?: boolean;
};

export function useStockSpeciesOverview(filter: StockSpeciesFilter) {
    const [allRows, setAllRows] = useState<SpeciesStockBlock[]>([]);
    const [rows, setRows] = useState<SpeciesStockBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Load all data once
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from("view_stock_species_with_pricing")
                    .select("*");

                if (error) throw error;
                setAllRows((data as SpeciesStockBlock[]) || []);
            } catch (err) {
                console.error("Error loading stock species overview:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Filter data when filter changes
    useEffect(() => {
        let filtered = [...allRows];

        if (filter.speciesId && filter.speciesId !== "all") {
            filtered = filtered.filter(r => r.species_id === filter.speciesId);
        }
        if (filter.sizeLabel && filter.sizeLabel !== "all") {
            filtered = filtered.filter(r => r.size_label === filter.sizeLabel);
        }
        if (filter.heightLabel && filter.heightLabel !== "all") {
            filtered = filtered.filter(r => r.height_label === filter.heightLabel);
        }
        if (filter.gradeId && filter.gradeId !== "all") {
            filtered = filtered.filter(r => r.grade_id === filter.gradeId);
        }
        if (filter.onlyAvailable) {
            filtered = filtered.filter(r => r.available_qty > 0);
        }
        if (filter.hideUntaggedOnly) {
            filtered = filtered.filter((r) => r.untagged_qty === 0);
        }

        setRows(filtered);
    }, [allRows, filter]);

    return { rows, allRows, loading, error };
}
