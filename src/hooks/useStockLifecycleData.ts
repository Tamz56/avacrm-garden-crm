import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
    SpeciesStockBlock,
    StockFilterState,
    StockLifecycleSummary,
    ZoneStockRow,
} from "../types/stockLifecycle";

export function useStockLifecycleData(filter: StockFilterState) {
    const [rawData, setRawData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Options for filter bar
    const [speciesOptions, setSpeciesOptions] = useState<{ value: string; label: string }[]>([]);
    const [zoneOptions, setZoneOptions] = useState<{ value: string; label: string }[]>([]);
    const [plotTypeOptions, setPlotTypeOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from("view_stock_zone_lifecycle")
                .select("*");

            if (error) throw error;

            setRawData(data || []);

            // Extract options for filters
            if (data) {
                const uniqueSpecies = Array.from(new Set(data.map(r => JSON.stringify({ id: r.species_id, name: r.species_name_th }))))
                    .map(s => JSON.parse(s))
                    .sort((a, b) => a.name.localeCompare(b.name));

                setSpeciesOptions(uniqueSpecies.map(s => ({ value: s.id, label: s.name })));

                const uniqueZones = Array.from(new Set(data.map(r => JSON.stringify({ id: r.zone_id, name: r.zone_name }))))
                    .map(z => JSON.parse(z))
                    .sort((a, b) => a.name.localeCompare(b.name));

                setZoneOptions(uniqueZones.map(z => ({ value: z.id, label: z.name })));

                const uniquePlotTypes = Array.from(new Set(data.map(r => r.plot_type).filter(Boolean)))
                    .sort();

                setPlotTypeOptions(uniquePlotTypes.map(p => ({ value: p, label: p })));
            }

        } catch (err: any) {
            console.error("Error loading stock lifecycle data:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter and Group Data
    const { summary, blocks } = useMemo(() => {
        if (!rawData.length) {
            return {
                summary: {
                    totalTrees: 0,
                    available: 0,
                    reserved: 0,
                    digOrdered: 0,
                    dug: 0,
                    shipped: 0,
                    planted: 0,
                    totalValue: 0,
                },
                blocks: [],
            };
        }

        // 1. Filter
        const filtered = rawData.filter(row => {
            if (filter.speciesId && filter.speciesId !== "all" && row.species_id !== filter.speciesId) return false;
            if (filter.zoneId && filter.zoneId !== "all" && row.zone_id !== filter.zoneId) return false;
            if (filter.plotType && filter.plotType !== "all" && row.plot_type !== filter.plotType) return false;

            // Lifecycle status filter is tricky because a row has counts for multiple statuses.
            // If the user selects "available", should we show rows that have available_qty > 0?
            // Or should we only count the available_qty in the summary?
            // Usually, for a "filter", we show items that match.
            if (filter.lifecycleStatus && filter.lifecycleStatus !== "all") {
                const statusKey = filter.lifecycleStatus + "_qty"; // e.g. available_qty
                if (row[statusKey] <= 0) return false;
            }

            return true;
        });

        // 2. Calculate Summary
        const summary: StockLifecycleSummary = {
            totalTrees: 0,
            available: 0,
            reserved: 0,
            digOrdered: 0,
            dug: 0,
            shipped: 0,
            planted: 0,
            totalValue: 0, // We don't have price info in this view yet, so 0 for now
        };

        filtered.forEach(row => {
            const qty = Number(row.total_qty ?? row.inventory_qty ?? 0);
            summary.totalTrees += qty;
            summary.available += Number(row.available_qty) || 0;
            summary.reserved += Number(row.reserved_qty) || 0;
            summary.digOrdered += Number(row.dig_ordered_qty) || 0;
            summary.dug += Number(row.dug_qty) || 0;
            summary.shipped += Number(row.shipped_qty) || 0;
            summary.planted += Number(row.planted_qty) || 0;
        });

        // 3. Group by Species
        const blocksMap = new Map<string, SpeciesStockBlock>();

        filtered.forEach(row => {
            if (!blocksMap.has(row.species_id)) {
                blocksMap.set(row.species_id, {
                    speciesId: row.species_id,
                    speciesNameTh: row.species_name_th,
                    speciesNameEn: row.species_name_en,
                    measureByHeight: row.measure_by_height,
                    totalQty: 0,
                    availableQty: 0,
                    reservedQty: 0,
                    digOrderedQty: 0,
                    shippedQty: 0,
                    estimatedValue: 0,
                    zones: [],
                });
            }

            const block = blocksMap.get(row.species_id)!;
            const qty = Number(row.total_qty ?? row.inventory_qty ?? 0);
            block.totalQty += qty;
            block.availableQty += Number(row.available_qty) || 0;
            block.reservedQty += Number(row.reserved_qty) || 0;
            block.digOrderedQty += Number(row.dig_ordered_qty) || 0;
            block.shippedQty += Number(row.shipped_qty) || 0;

            const zoneRow: ZoneStockRow = {
                zoneId: row.zone_id,
                zoneName: row.zone_name,
                farmName: row.farm_name,
                plotTypeName: row.plot_type,
                sizeLabel: row.size_label,
                heightLabel: row.height_label,
                availableQty: row.available_qty || 0,
                reservedQty: row.reserved_qty || 0,
                digOrderedQty: row.dig_ordered_qty || 0,
                dugQty: row.dug_qty || 0,
                shippedQty: row.shipped_qty || 0,
                plantedQty: row.planted_qty || 0,
                untaggedQty: row.untagged_qty || 0,
            };

            block.zones.push(zoneRow);
        });

        return {
            summary,
            blocks: Array.from(blocksMap.values()),
        };
    }, [rawData, filter]);

    return {
        loading,
        error,
        summary,
        blocks,
        speciesOptions,
        zoneOptions,
        plotTypeOptions,
        refresh: loadData,
    };
}
