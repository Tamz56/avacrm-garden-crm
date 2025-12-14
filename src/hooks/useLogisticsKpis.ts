import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface LogisticsKpis {
    total_shipments: number;
    total_distance_km: number;
    total_cost: number;
    avg_cost_per_shipment: number;
    avg_cost_per_km: number;
    total_trees: number;
    avg_cost_per_tree: number;
}

export function useLogisticsKpis(dateFrom: string, dateTo: string) {
    const [kpis, setKpis] = useState<LogisticsKpis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchKpis = async () => {
            if (!dateFrom || !dateTo) return;
            setLoading(true);
            setError(null);

            const { data, error } = await supabase.rpc('get_logistics_kpis', {
                _date_from: dateFrom,
                _date_to: dateTo,
            });

            if (error) {
                console.error(error);
                setError(error.message);
            } else if (data && data.length > 0) {
                setKpis(data[0] as LogisticsKpis);
            } else {
                setKpis({
                    total_shipments: 0,
                    total_distance_km: 0,
                    total_cost: 0,
                    avg_cost_per_shipment: 0,
                    avg_cost_per_km: 0,
                    total_trees: 0,
                    avg_cost_per_tree: 0,
                });
            }

            setLoading(false);
        };

        fetchKpis();
    }, [dateFrom, dateTo]);

    return { kpis, loading, error };
}
