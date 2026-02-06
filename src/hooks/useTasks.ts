import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import type { DashboardTask } from "./useDashboardTasks";

export function useTasks(status: string | null, limit = 200) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<DashboardTask[]>([]);
    const aliveRef = useRef(true);

    const run = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: userRes, error: userErr } = await supabase.auth.getUser();
            if (userErr) throw userErr;
            const uid = userRes?.user?.id;
            if (!uid) {
                setRows([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc("get_tasks_v1", {
                p_assigned_to: uid,
                p_status: status,   // null = all
                p_limit: limit,
            });
            if (error) throw error;

            if (!aliveRef.current) return;
            setRows((data ?? []) as DashboardTask[]);
            setLoading(false);
        } catch (e: any) {
            if (!aliveRef.current) return;
            setError(e?.message ?? "Failed to load tasks");
            setRows([]);
            setLoading(false);
        }
    }, [status, limit]);

    useEffect(() => {
        aliveRef.current = true;
        run();
        return () => {
            aliveRef.current = false;
        };
    }, [run]);

    return { loading, error, rows, refetch: run };
}
