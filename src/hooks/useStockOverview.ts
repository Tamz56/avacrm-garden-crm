import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface UseStockOverviewParams {
    zoneId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export function useStockOverview({
    zoneId,
    status = 'all',
    page = 1,
    pageSize = 50,
    sortBy = 'species_name',
    sortDir = 'asc'
}: UseStockOverviewParams) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                let query = supabase
                    .from('stock_items')
                    .select(`
            *,
            stock_species (
              name_th,
              name_en
            )
          `);

                if (zoneId) {
                    query = query.eq('zone_id', zoneId);
                }

                if (status !== 'all') {
                    query = query.eq('status', status);
                }

                // Pagination
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                query = query.range(from, to);

                // Sorting (simplified, might need adjustment based on actual column names)
                if (sortBy === 'species_name') {
                    // Sorting by joined table column is tricky in simple query, 
                    // might need to sort client side or use a view. 
                    // For now, let's just order by id if species_name is requested to avoid error
                    // or try to order by species_id
                    query = query.order('species_id', { ascending: sortDir === 'asc' });
                } else {
                    query = query.order(sortBy, { ascending: sortDir === 'asc' });
                }

                const { data: result, error: fetchError } = await query;

                if (fetchError) throw fetchError;

                // Transform data to match what ZoneDetailPage expects
                const transformedData = result?.map(item => ({
                    ...item,
                    species_name: item.stock_species?.name_th || item.stock_species?.name_en,
                    stock_item_id: item.id
                })) || [];

                setData(transformedData);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [zoneId, status, page, pageSize, sortBy, sortDir]);

    return { data, loading, error };
}
