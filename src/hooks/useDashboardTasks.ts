import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

export type DashboardTask = {
    id: string;
    deal_id: string | null;
    task_type: string;
    status: "pending" | "in_progress" | "completed" | "cancelled" | string;
    due_date: string | null; // date
    assigned_to: string | null;
    notes: string | null;
    created_at: string | null; // timestamp
    context_type?: string | null;
    context_id?: string | null;
    source?: string | null;
};

type State = {
    loading: boolean;
    error: string | null;
    rows: DashboardTask[];
    lastUpdatedAt: number;
};


type BucketKey = 'overdue' | 'today' | 'next7' | 'later' | 'no_due';

const BUCKET_ORDER: BucketKey[] = ['overdue', 'today', 'next7', 'later', 'no_due'];

function toDateOnly(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISODateOnly(s?: string | null) {
    if (!s) return null;
    // "2026-02-05" -> Date
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function getBucket(due: Date | null): BucketKey {
    if (!due) return 'no_due';
    const today = toDateOnly(new Date());
    const dueDay = toDateOnly(due);
    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'next7';
    return 'later';
}

function sortByBucketAndDue(a: DashboardTask, b: DashboardTask) {
    const da = parseISODateOnly(a.due_date);
    const db = parseISODateOnly(b.due_date);

    const ba = getBucket(da);
    const bb = getBucket(db);

    const bucketCmp = BUCKET_ORDER.indexOf(ba) - BUCKET_ORDER.indexOf(bb);
    if (bucketCmp !== 0) return bucketCmp;

    const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
    const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;

    // fallback: created_at ใหม่ก่อน/เก่าก่อน เลือกอย่างใดอย่างหนึ่ง
    return (a.created_at || '').localeCompare(b.created_at || '');
}

function groupByBucket(sorted: DashboardTask[]) {
    const g: Record<BucketKey, DashboardTask[]> = {
        overdue: [],
        today: [],
        next7: [],
        later: [],
        no_due: [],
    };

    for (const t of sorted) {
        g[getBucket(parseISODateOnly(t.due_date))].push(t);
    }
    return g;
}

export function useDashboardTasks(limit = 8) {
    const [state, setState] = useState<State>({
        loading: true,
        error: null,
        rows: [],
        lastUpdatedAt: Date.now(),
    });

    const aliveRef = useRef(true);

    const run = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));

        try {
            const { data: userRes, error: userErr } = await supabase.auth.getUser();
            if (userErr) throw userErr;

            const uid = userRes?.user?.id;
            if (!uid) {
                // ยังไม่มี session (หรือหลุด)
                if (!aliveRef.current) return;
                setState((s) => ({ ...s, loading: false, rows: [], lastUpdatedAt: Date.now() }));
                return;
            }

            // ⚠️ ห้ามส่ง p_assigned_to เป็น null เด็ดขาด
            const { data, error } = await supabase.rpc("get_dashboard_tasks", {
                p_assigned_to: uid,
                p_limit: limit,
            });

            if (error) throw error;

            if (!aliveRef.current) return;
            setState((s) => ({
                ...s,
                loading: false,
                rows: (data ?? []) as DashboardTask[],
                lastUpdatedAt: Date.now(),
            }));
        } catch (e: any) {
            if (!aliveRef.current) return;
            setState((s) => ({
                ...s,
                loading: false,
                error: e?.message ?? "Failed to load dashboard tasks",
                rows: [],
                lastUpdatedAt: Date.now(),
            }));
        }
    }, [limit]);

    useEffect(() => {
        aliveRef.current = true;
        run();
        return () => {
            aliveRef.current = false;
        };
    }, [run]);

    const refetch = useCallback(() => run(), [run]);

    const meta = useMemo(() => {
        const pending = state.rows.filter((r) => r.status === "pending").length;
        const inProgress = state.rows.filter((r) => r.status === "in_progress").length;
        return { pending, inProgress, total: state.rows.length };
    }, [state.rows]);

    const tasksSorted = useMemo(() => [...state.rows].sort(sortByBucketAndDue), [state.rows]);
    const taskGroups = useMemo(() => groupByBucket(tasksSorted), [tasksSorted]);

    return { ...state, meta, refetch, tasksSorted, taskGroups };
}
