import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export type TagTimelineEvent = {
    event_id: string;
    tag_id: string;
    event_type: string;
    event_at: string;
    from_status: string | null;
    to_status: string | null;
    actor_user_id: string | null;
    source: string | null;
    context_type: string | null;
    context_id: string | null;
    notes: string | null;
    is_correction: boolean;
};

export function useTagTimeline(tagId: string | null, limit = 30, offset = 0) {
    const [data, setData] = useState<TagTimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tagId) return;

        let alive = true;
        (async () => {
            setLoading(true);
            setError(null);

            try {
                // Determine if we should call the RPC or select directly if RPC isn't available yet as per task instructions?
                // User prompt strictly said: "Use RPC that you already made get_tag_timeline_v1"
                // Assuming get_tag_timeline_v1 exists.
                const { data, error } = await supabase.rpc("get_tag_timeline_v1", {
                    p_tag_id: tagId,
                    p_limit: limit,
                    p_offset: offset,
                });

                if (!alive) return;

                if (error) throw error;
                setData((data ?? []) as TagTimelineEvent[]);
            } catch (err: any) {
                console.error("Error fetching tag timeline:", err);
                if (alive) setError(err.message);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [tagId, limit, offset]);

    return { data, loading, error };
}
