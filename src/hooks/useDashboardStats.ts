import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface DashboardKpis {
    ready_qty: number;
    ready_species_count: number;
    ready_zone_count: number;
    untagged_qty: number;
    untagged_zone_count: number;
    open_deals_count: number;
    open_deals_amount: number;
    active_dig_orders_count: number;
    active_dig_orders_qty: number;
}

export function useDashboardStats(farmId?: string | null, dateFrom?: Date, dateTo?: Date) {
    const [stats, setStats] = useState<DashboardKpis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                setError(null);

                // Format dates as YYYY-MM-DD if provided, otherwise let RPC use defaults
                const p_date_from = dateFrom ? dateFrom.toISOString().split('T')[0] : undefined;
                const p_date_to = dateTo ? dateTo.toISOString().split('T')[0] : undefined;

                const { data, error } = await supabase.rpc('get_dashboard_kpis', {
                    p_farm_id: farmId || null,
                    p_date_from,
                    p_date_to
                });

                if (error) throw error;

                if (data && data.length > 0) {
                    setStats(data[0]);
                } else {
                    // Handle empty result (shouldn't happen with the current RPC structure but good for safety)
                    setStats({
                        ready_qty: 0,
                        ready_species_count: 0,
                        ready_zone_count: 0,
                        untagged_qty: 0,
                        untagged_zone_count: 0,
                        open_deals_count: 0,
                        open_deals_amount: 0,
                        active_dig_orders_count: 0,
                        active_dig_orders_qty: 0
                    });
                }
            } catch (err: any) {
                console.error('Error fetching dashboard stats:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [farmId, dateFrom, dateTo]);

    return { stats, loading, error };
}
