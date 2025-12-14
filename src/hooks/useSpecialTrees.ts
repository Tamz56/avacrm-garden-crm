import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type SpecialTreeRow = {
    id: string;                   // tag_id
    tag_code: string;
    tree_category: string | null;
    display_name: string | null;
    feature_notes: string | null;
    primary_image_url: string | null;
    extra_image_urls: string[] | null;
    zone_id: string;
    zone_name: string;
    farm_name: string;
    species_id: string;
    species_name_th: string;
    species_name_en: string;
    species_code: string;
    size_label: string;
    planting_row: number | null;
    planting_position: number | null;
    status: string;
    note: string | null;
    created_at: string;
};

export function useSpecialTrees() {
    const [rows, setRows] = useState<SpecialTreeRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("view_special_trees")
                .select("*")
                .order("created_at", { ascending: false });

            if (cancelled) return;

            if (error) {
                console.error("load special trees error", error);
                setError(error.message);
            } else {
                setRows((data || []) as SpecialTreeRow[]);
            }

            setLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { rows, loading, error };
}
