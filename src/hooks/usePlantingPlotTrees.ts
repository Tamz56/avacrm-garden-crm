import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface PlantingPlotTree {
    id: string;
    plot_id: string;
    species_id: string;
    species_name_th?: string;
    species_name_en?: string;
    size_label: string;
    planted_count: number;
    moved_to_stock_count: number;
    remaining_in_plot: number;
    planted_date?: string;
}

export function usePlantingPlotTrees(zoneId?: string) {
    const [data, setData] = useState<PlantingPlotTree[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('view_planting_plot_trees_ext')
                .select('*');

            if (zoneId) {
                query = query.eq('plot_id', zoneId);
            }

            const { data: result, error: fetchError } = await query.order('species_name_th');

            if (fetchError) throw fetchError;

            setData(result as PlantingPlotTree[]);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [zoneId]);

    return { data, loading, error, refetch: fetchData };
}
