import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useZoneMutations = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createZone = async (zoneData: any) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('stock_zones')
                .insert([{
                    name: zoneData.name,
                    farm_name: zoneData.location,
                    description: zoneData.note,
                    plot_type: zoneData.zoneType || null,

                    // New fields
                    area_rai: zoneData.areaRai ? Number(zoneData.areaRai) : null,
                    area_width_m: zoneData.areaWidth ? Number(zoneData.areaWidth) : null,
                    area_length_m: zoneData.areaLength ? Number(zoneData.areaLength) : null,
                    planting_rows: zoneData.plantingRows ? Number(zoneData.plantingRows) : null,
                    pump_size_hp: zoneData.pumpSize ? Number(zoneData.pumpSize) : null,
                    water_source: zoneData.waterSource,

                    // Inspection fields
                    inspection_date: zoneData.inspectionDate || null,
                    inspection_trunk_inch: zoneData.inspectionTrunkInch ? Number(zoneData.inspectionTrunkInch) : null,
                    inspection_height_m: zoneData.inspectionHeightM ? Number(zoneData.inspectionHeightM) : null,
                    inspection_pot_inch: zoneData.inspectionPotInch ? Number(zoneData.inspectionPotInch) : null,
                    inspection_notes: zoneData.inspectionNotes || null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateZone = async (id: string, zoneData: any) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('stock_zones')
                .update({
                    name: zoneData.name,
                    farm_name: zoneData.location,
                    description: zoneData.note,
                    plot_type: zoneData.zoneType || null,

                    // New fields
                    area_rai: zoneData.areaRai ? Number(zoneData.areaRai) : null,
                    area_width_m: zoneData.areaWidth ? Number(zoneData.areaWidth) : null,
                    area_length_m: zoneData.areaLength ? Number(zoneData.areaLength) : null,
                    planting_rows: zoneData.plantingRows ? Number(zoneData.plantingRows) : null,
                    pump_size_hp: zoneData.pumpSize ? Number(zoneData.pumpSize) : null,
                    water_source: zoneData.waterSource,

                    // Inspection fields
                    inspection_date: zoneData.inspectionDate || null,
                    inspection_trunk_inch: zoneData.inspectionTrunkInch ? Number(zoneData.inspectionTrunkInch) : null,
                    inspection_height_m: zoneData.inspectionHeightM ? Number(zoneData.inspectionHeightM) : null,
                    inspection_pot_inch: zoneData.inspectionPotInch ? Number(zoneData.inspectionPotInch) : null,
                    inspection_notes: zoneData.inspectionNotes || null,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteZone = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            // Delete stock items first? Supabase might handle cascade if configured, 
            // but safer to delete items first if no cascade.
            // Let's assume cascade is ON or we delete items manually.
            const { error: itemsError } = await supabase
                .from('stock_items')
                .delete()
                .eq('zone_id', id);

            if (itemsError) throw itemsError;

            const { error } = await supabase
                .from('stock_zones')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Update zone location via RPC
     */
    const updateZoneLocation = async (
        zoneId: string,
        lat: number | null,
        lng: number | null,
        mapUrl: string | null,
        boundary: any | null = null
    ) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.rpc('update_stock_zone_location', {
                p_zone_id: zoneId,
                p_lat: lat,
                p_lng: lng,
                p_map_url: mapUrl,
                p_boundary: boundary,
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };


    // Sync trees for a zone
    const saveZoneTrees = async (zoneId: string, trees: any[]) => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch existing trees to backup moved_to_stock_count
            const { data: existingTrees, error: fetchError } = await supabase
                .from('planting_plot_trees')
                .select('species_id, size_label, moved_to_stock_count')
                .eq('plot_id', zoneId);

            if (fetchError) throw fetchError;

            // Create a backup map: key = `${species_id}|${size_label}` -> moved_to_stock_count
            const backupMap = new Map<string, number>();
            existingTrees?.forEach(t => {
                backupMap.set(`${t.species_id}|${t.size_label}`, t.moved_to_stock_count || 0);
            });

            // 2. Delete ALL existing trees for this plot
            const { error: delError } = await supabase
                .from('planting_plot_trees')
                .delete()
                .eq('plot_id', zoneId);

            if (delError) throw delError;

            // Helper to get species_id
            const getSpeciesId = (name: string) => {
                if (name && name.toLowerCase().includes('golden')) return '23936cb7-7305-410f-b194-8e34848977d7';
                if (name && name.toLowerCase().includes('rosy')) return 'f8548346-655f-4654-9461-826027387399';
                if (name && name.toLowerCase().includes('black')) return 'e9038234-526f-4028-a284-887413813333';
                return '16c54bea-3d0b-424d-aa11-cdce3864fc55'; // Default Silver Oak
            };

            // 3. Prepare new rows
            const newRows = trees
                .filter(t => t.species && (Number(t.plannedCount) > 0)) // Filter valid rows
                .map(t => {
                    const speciesId = getSpeciesId(t.species);
                    const sizeLabel = t.size || '-';
                    const key = `${speciesId}|${sizeLabel}`;
                    const preservedMovedCount = backupMap.get(key) || 0;

                    return {
                        plot_id: zoneId,
                        species_id: speciesId,
                        size_label: sizeLabel,
                        planted_count: Number(t.plannedCount),
                        planted_date: t.plantedAt || null,
                        moved_to_stock_count: preservedMovedCount, // Restore history
                        // note: t.note || null,
                    };
                });

            // 4. Insert new rows
            if (newRows.length > 0) {
                const { error: insertError } = await supabase
                    .from('planting_plot_trees')
                    .insert(newRows);

                if (insertError) throw insertError;
            }

        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        createZone,
        updateZone,
        deleteZone,
        updateZoneLocation,
        saveZoneTrees,
        loading,
        error
    };
};
