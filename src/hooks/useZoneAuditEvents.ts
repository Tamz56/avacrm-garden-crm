import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type ZoneAuditEventType =
    | 'inspection'
    | 'maintenance'
    | 'checklist_weekly'
    | 'checklist_monthly'
    | 'health_assessment'
    | 'form_score'
    | 'growth_snapshot';

export interface ZoneAuditEvent {
    id: string;
    zone_id: string;
    zone_name?: string;
    event_type: ZoneAuditEventType;
    event_date: string;
    actor_name: string | null;
    notes: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
}

export interface AddEventParams {
    zone_id: string;
    event_type: ZoneAuditEventType;
    event_date: string;
    actor_name?: string;
    notes?: string;
    payload?: Record<string, unknown>;
}

export const useZoneAuditEvents = (zoneId: string | null) => {
    const [events, setEvents] = useState<ZoneAuditEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async (limit?: number) => {
        if (!zoneId) return;
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('view_zone_audit_events')
                .select('*')
                .eq('zone_id', zoneId)
                .order('event_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (limit) {
                query = query.limit(limit);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setEvents((data || []) as ZoneAuditEvent[]);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error fetching audit events:', err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [zoneId]);

    const addEvent = async (params: AddEventParams): Promise<boolean> => {
        try {
            const { error: insertError } = await supabase
                .from('zone_audit_events')
                .insert([{
                    zone_id: params.zone_id,
                    event_type: params.event_type,
                    event_date: params.event_date,
                    actor_name: params.actor_name || null,
                    notes: params.notes || null,
                    payload: params.payload || null,
                }]);

            if (insertError) throw insertError;

            // Refresh events if this is the current zone
            if (params.zone_id === zoneId) {
                await fetchEvents();
            }

            return true;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('Error adding audit event:', err);
            setError(errorMessage);
            return false;
        }
    };

    // Static function for use outside the hook context
    const addEventStatic = async (params: AddEventParams): Promise<boolean> => {
        try {
            const { error: insertError } = await supabase
                .from('zone_audit_events')
                .insert([{
                    zone_id: params.zone_id,
                    event_type: params.event_type,
                    event_date: params.event_date,
                    actor_name: params.actor_name || null,
                    notes: params.notes || null,
                    payload: params.payload || null,
                }]);

            if (insertError) throw insertError;
            return true;
        } catch (err: unknown) {
            console.error('Error adding audit event (static):', err);
            return false;
        }
    };

    useEffect(() => {
        if (zoneId) {
            fetchEvents();
        } else {
            setEvents([]);
        }
    }, [zoneId, fetchEvents]);

    return {
        events,
        loading,
        error,
        addEvent,
        addEventStatic,
        refresh: fetchEvents,
        fetchRecentEvents: (limit: number) => fetchEvents(limit),
    };
};

// Export static helper for use in other hooks
export const logZoneAuditEvent = async (params: AddEventParams): Promise<boolean> => {
    try {
        const { error: insertError } = await supabase
            .from('zone_audit_events')
            .insert([{
                zone_id: params.zone_id,
                event_type: params.event_type,
                event_date: params.event_date,
                actor_name: params.actor_name || null,
                notes: params.notes || null,
                payload: params.payload || null,
            }]);

        if (insertError) throw insertError;
        return true;
    } catch (err: unknown) {
        console.error('Error logging audit event:', err);
        return false;
    }
};
