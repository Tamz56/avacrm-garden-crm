import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type TagSearchRow = {
    id: string;
    tag_code: string;
    status: string;
    size_label: string;
    grade: string | null;
    planting_row: string | null;
    planting_position: string | null;
    note: string | null;
    zone_id: string;
    zone_name: string;
    farm_name: string;
    species_id: string;
    species_name_th: string;
    species_name_en: string | null;
    species_code: string;
    deal_id: string | null;
    deal_code: string | null;
    dig_order_id: string | null;
    dig_order_code: string | null;
    dig_purpose: string | null;
    tree_category: string | null;
    display_name: string | null;
    feature_notes: string | null;
    primary_image_url: string | null;
    extra_image_urls: string[] | null;
    created_at: string;
    updated_at: string;
};

export type TagSearchFilter = {
    tagCode?: string;
    speciesId?: string;
    zoneId?: string;
    status?: string;
    grade?: string;
    sizeLabel?: string;
    dealCode?: string;
    digOrderCode?: string;
    digPurpose?: string;
};

export function useTagSearch(filter: TagSearchFilter, page = 1, pageSize = 50) {
    const [rows, setRows] = useState<TagSearchRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const fetchTags = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('view_tag_search')
                .select('*', { count: 'exact' });

            if (filter.tagCode) {
                query = query.ilike('tag_code', `%${filter.tagCode}%`);
            }
            if (filter.speciesId && filter.speciesId !== 'all') {
                query = query.eq('species_id', filter.speciesId);
            }
            if (filter.zoneId && filter.zoneId !== 'all') {
                query = query.eq('zone_id', filter.zoneId);
            }
            if (filter.status && filter.status !== 'all') {
                query = query.eq('status', filter.status);
            }
            if (filter.grade && filter.grade !== 'all') {
                query = query.eq('grade', filter.grade);
            }
            if (filter.sizeLabel && filter.sizeLabel !== 'all') {
                query = query.eq('size_label', filter.sizeLabel);
            }
            if (filter.dealCode) {
                query = query.ilike('deal_code', `%${filter.dealCode}%`);
            }
            if (filter.digOrderCode) {
                query = query.ilike('dig_order_code', `%${filter.digOrderCode}%`);
            }
            if (filter.digPurpose && filter.digPurpose !== 'all') {
                // Assuming view_tag_search has dig_purpose or we need to join dig_orders
                // The view_tag_search currently joins dig_orders as 'o'.
                // Let's check view_tag_search definition again.
                // It selects o.code as dig_order_code.
                // I need to check if it selects dig_purpose.
                // If not, I need to update view_tag_search first.
                // But wait, the user instructions said "Tag List v2 – อ่าน query param dig_purpose".
                // And "ใน view_tag_search / useTagSearch ถ้าจะรองรับ filter dig_purpose จริง ๆ อาจต้องให้ atgt เพิ่ม join dig_orders + column/เงื่อนไขเพิ่ม".
                // So I should probably update the view first or assume it's there.
                // I haven't updated view_tag_search to include dig_purpose yet.
                // I should update view_tag_search to include dig_purpose from dig_orders table.
                // But for now, let's add the logic here assuming the column will be available as 'dig_purpose' in the view.
                // Actually, I should check if I can filter by joined table column without selecting it in view?
                // No, Supabase view filters apply to view columns.
                // So I MUST update view_tag_search.
                query = query.eq('dig_purpose', filter.digPurpose);
            }

            // Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            // Sorting (default by updated_at desc, then tag_code asc)
            query = query.order('updated_at', { ascending: false }).order('tag_code', { ascending: true });

            const { data, error, count } = await query;

            if (error) throw error;

            setRows(data || []);
            setTotalCount(count || 0);

        } catch (err: any) {
            console.error('Error fetching tags:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filter, page, pageSize]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    return { rows, loading, error, totalCount, reload: fetchTags };
}
