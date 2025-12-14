import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface PlotInventoryRow {
    id: string;
    plot_id: string;
    plot_name: string;
    species_id: string;
    species_name_th: string;
    size_label: string;
    height_label: string | null;
    planted_qty: number;
    created_tag_qty: number;
    remaining_for_tag: number;
    planted_date: string | null;
    note: string | null;
}

export interface PlotInventorySummary {
    totalPlanted: number;
    totalCreatedTags: number;
    totalRemaining: number;
}

const calcSummary = (items: PlotInventoryRow[]): PlotInventorySummary => {
    let totalPlanted = 0;
    let totalCreatedTags = 0;
    let totalRemaining = 0;

    for (const r of items) {
        totalPlanted += r.planted_qty ?? 0;
        totalCreatedTags += r.created_tag_qty ?? 0;
        totalRemaining += r.remaining_for_tag ?? 0;
    }

    return { totalPlanted, totalCreatedTags, totalRemaining };
};

export function usePlotInventory(plotId?: string) {
    const [rows, setRows] = useState<PlotInventoryRow[]>([]);
    const [summary, setSummary] = useState<PlotInventorySummary>({
        totalPlanted: 0,
        totalCreatedTags: 0,
        totalRemaining: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInventory = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('view_plot_tree_inventory')
                .select('*')
                .eq('plot_id', id)
                .order('species_name_th', { ascending: true });

            if (error) throw error;
            const items = (data ?? []) as PlotInventoryRow[];
            setRows(items);
            setSummary(calcSummary(items));
            return items;
        } catch (err: any) {
            console.error('Error fetching inventory:', err);
            setError(err.message);
            setRows([]);
            setSummary({ totalPlanted: 0, totalCreatedTags: 0, totalRemaining: 0 });
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const reload = useCallback(async () => {
        if (plotId) {
            await fetchInventory(plotId);
        }
    }, [plotId, fetchInventory]);

    useEffect(() => {
        if (plotId) reload();
    }, [plotId, reload]);

    const fetchInventoryData = fetchInventory;

    const addInventoryItem = async (
        plotId: string,
        speciesId: string,
        sizeLabel: string,
        heightLabel: string,
        plantedQty: number,
        plantedDate: string | null,
        note: string
    ) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('planting_plot_inventory')
                .insert({
                    plot_id: plotId,
                    species_id: speciesId,
                    size_label: sizeLabel,
                    height_label: heightLabel || null,
                    planted_qty: plantedQty,
                    planted_date: plantedDate || null,
                    note: note || null,
                });

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('add plot inventory error', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const createTagsFromInventory = async (
        inventoryId: string,
        qty: number,
        category: string
    ) => {
        setLoading(true);
        setError(null);
        try {
            // Validate qty against remaining_for_tag
            const row = rows.find(r => r.id === inventoryId);
            if (!row) throw new Error('ไม่พบข้อมูลรายการในแปลง');
            if (qty <= 0) throw new Error('จำนวนที่สร้าง Tag ต้องมากกว่า 0');
            if (qty > row.remaining_for_tag) {
                throw new Error(`จำนวนที่ขอสร้าง (${qty}) มากกว่ายอดคงเหลือ (${row.remaining_for_tag})`);
            }

            const { data, error } = await supabase.rpc('create_tags_from_plot_inventory', {
                p_inventory_id: inventoryId,
                p_create_qty: qty,
                p_tree_category: category,
                p_default_status: 'in_zone',  // ต้องเป็น 'in_zone' เพราะ view นับจาก status นี้
            });

            if (error) throw error;

            // Reload to update created_tag_qty / remaining_for_tag
            if (plotId) {
                await fetchInventory(plotId);
            }

            return data;
        } catch (err: any) {
            console.error('Error creating tags:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateInventoryItem = async (
        id: string,
        updates: {
            species_id?: string;
            size_label?: string;
            height_label?: string | null;
            planted_qty?: number;
            planted_date?: string | null;
            note?: string | null;
        }
    ) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('planting_plot_inventory')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('update plot inventory error', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteInventoryItem = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('planting_plot_inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err: any) {
            console.error('delete plot inventory error', err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    /**
     * ย้ายจำนวนต้นไม้จากขนาดหนึ่งไปอีกขนาดหนึ่ง (Growth / Reclassify)
     * บันทึก log ไว้ใน planting_plot_tree_movements
     */
    const applySizeTransition = async (params: {
        plotId: string;
        speciesId: string;
        fromSizeLabel: string;
        toSizeLabel: string;
        qty: number;
        effectiveDate?: string;
        reason?: 'growth' | 'sale' | 'loss' | 'correction' | 'transfer';
        note?: string;
    }) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.rpc('apply_plot_size_transition', {
                p_plot_id: params.plotId,
                p_species_id: params.speciesId,
                p_from_size_label: params.fromSizeLabel,
                p_to_size_label: params.toSizeLabel,
                p_qty: params.qty,
                p_effective_date: params.effectiveDate || null,
                p_reason: params.reason || 'growth',
                p_note: params.note || null,
            });

            if (error) throw error;

            // Reload inventory after transition
            if (plotId) {
                await fetchInventory(plotId);
            }

            return { success: true, data };
        } catch (err: any) {
            console.error('apply size transition error', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return {
        rows,
        summary,
        loading,
        error,
        reload,
        fetchInventory: fetchInventoryData,
        addInventoryItem,
        createTagsFromInventory,
        updateInventoryItem,
        deleteInventoryItem,
        applySizeTransition,
    };
}
