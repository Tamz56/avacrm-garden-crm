import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface ZoneInspectionLog {
    id: string;
    zone_id: string;
    check_date: string;
    tree_count: number | null;
    trunk_size_inch: number | null;
    height_m: number | null;
    pot_size_inch: number | null;
    maintenance_notes: string | null;
    created_at: string;
    created_by: string | null;
}

export interface ZoneLatestInspection {
    zone_id: string;
    zone_name: string;
    latest_log_id: string | null;
    check_date: string | null;
    tree_count: number | null;
    trunk_size_inch: number | null;
    height_m: number | null;
    pot_size_inch: number | null;
    maintenance_notes: string | null;
}

export const useZoneInspection = (zoneId: string | null) => {
    const [logs, setLogs] = useState<ZoneInspectionLog[]>([]);
    const [latestInspection, setLatestInspection] = useState<ZoneLatestInspection | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('zone_inspection_logs')
                .select('*')
                .eq('zone_id', zoneId)
                .order('check_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            console.error("Error fetching inspection logs:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [zoneId]);

    const fetchLatestInspection = useCallback(async () => {
        if (!zoneId) return;
        try {
            const { data, error } = await supabase
                .from('view_zone_latest_inspection')
                .select('*')
                .eq('zone_id', zoneId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
                throw error;
            }
            setLatestInspection(data || null);
        } catch (err: any) {
            console.error("Error fetching latest inspection:", err);
            // Don't set main error state for this auxiliary data
        }
    }, [zoneId]);

    const addLog = async (logData: Omit<ZoneInspectionLog, 'id' | 'created_at' | 'created_by'>) => {
        if (!zoneId) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('zone_inspection_logs')
                .insert([{ ...logData, zone_id: zoneId }]);

            if (error) throw error;

            await fetchLogs();
            await fetchLatestInspection();
            return true;
        } catch (err: any) {
            console.error("Error adding inspection log:", err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (zoneId) {
            fetchLogs();
            fetchLatestInspection();
        } else {
            setLogs([]);
            setLatestInspection(null);
        }
    }, [zoneId, fetchLogs, fetchLatestInspection]);

    return {
        logs,
        latestInspection,
        loading,
        error,
        addLog,
        refresh: fetchLogs
    };
};
