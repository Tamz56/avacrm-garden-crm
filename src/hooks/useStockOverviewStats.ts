import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { StockOverviewRow } from '../types/stockOverview';

export function useStockOverviewStats() {
    const [rows, setRows] = useState<StockOverviewRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('view_stock_overview_v2')
                .select('*')
                .order('species_name_th', { ascending: true })
                .order('size_label', { ascending: true })
                .order('zone_name', { ascending: true });

            if (error) {
                console.error(error);
                setError(error.message);
                setRows([]);
            } else {
                setRows((data || []) as StockOverviewRow[]);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    return { rows, loading, error };
}
