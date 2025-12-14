import { useMemo } from 'react';
import { useZoneStockSummary } from './useZoneStockSummary';
import { getStockStatus, StockStatus } from '../utils/stockStatus';

export function useLowStockZones() {
    const { data, loading: isLoading, error } = useZoneStockSummary();

    const lowZones = useMemo(() => {
        if (!data) return [];

        return data
            .map((z) => {
                const status = getStockStatus(z.remaining_trees, z.planned_trees);
                return { ...z, status };
            })
            .filter((z) => z.status === 'low' || z.status === 'empty')
            // Sort critical zones first (ascending remaining trees)
            .sort((a, b) => a.remaining_trees - b.remaining_trees);
    }, [data]);

    const totalLow = lowZones.filter((z) => z.status === 'low').length;
    const totalEmpty = lowZones.filter((z) => z.status === 'empty').length;

    return {
        lowZones,
        totalLow,
        totalEmpty,
        isLoading,
        error,
    };
}
