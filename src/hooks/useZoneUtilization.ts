import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface ZoneUtilizationRow {
    zone_id: string;
    zone_code: string | null;
    zone_name: string;
    farm_name: string | null;
    area_rai: number | null;
    area_width_m: number | null;
    area_length_m: number | null;
    planting_rows: number | null;
    is_active: boolean;

    total_trees: number;
    available_trees: number;
    reserved_trees: number;
    shipped_trees: number;
    trees_per_rai: number | null;
}

export function useZoneUtilization() {
    const [rows, setRows] = useState<ZoneUtilizationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('view_zone_utilization')
                .select('*')
                .order('zone_name', { ascending: true });

            if (error) {
                console.error('useZoneUtilization error', error);
                setError(error.message);
                setRows([]);
            } else {
                setRows((data || []) as ZoneUtilizationRow[]);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    return { rows, loading, error };
}
