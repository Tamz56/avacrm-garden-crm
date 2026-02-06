import React, { useMemo, useState, useEffect } from "react";
import CreateTaskModal from "../components/tasks/CreateTaskModal";
import { useTasks } from "../hooks/useTasks";
import { DashboardTask } from "../hooks/useDashboardTasks";
import { supabase } from "../supabaseClient";

// --- Helpers / Constants ---

const statusLabel: Record<string, string> = {
    pending: "รอดำเนินการ",
    in_progress: "กำลังทำ",
    completed: "เสร็จแล้ว",
    cancelled: "ยกเลิก",
};

function fmtDateTH(d?: string | null) {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "numeric", day: "numeric" });
}

function taskTypeLabel(taskType: string) {
    const map: Record<string, string> = {
        follow_up: "ติดตามลูกค้า",
        planting_followup: "ติดตามหลังปลูก",
        site_visit: "นัดเข้าหน้างานสำรวจพื้นที่",
        digging: "งานขุดล้อม",
        transport: "งานขนส่ง",
        planting: "งานปลูก",
        evaluation: "งานประเมิน",
    };
    return map[taskType] ?? taskType;
}

const bucketLabel: Record<string, string> = {
    overdue: "เกินกำหนด",
    today: "วันนี้",
    next7: "ภายใน 7 วัน",
    later: "ถัดไป",
    no_due: "ไม่มีกำหนด",
};

type BucketKey = 'overdue' | 'today' | 'next7' | 'later' | 'no_due';
const bucketOrder = ["overdue", "today", "next7", "later", "no_due"] as const;

// --- Bucket Logic (Ported locally) ---

function toDateOnly(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISODateOnly(s?: string | null) {
    if (!s) return null;
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

    const bucketCmp = bucketOrder.indexOf(ba) - bucketOrder.indexOf(bb);
    if (bucketCmp !== 0) return bucketCmp;

    const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
    const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;

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
        const b = getBucket(parseISODateOnly(t.due_date));
        if (g[b]) {
            g[b].push(t);
        } else {
            // Fallback for unexpected cases
            if (!g['no_due']) g['no_due'] = [];
            g['no_due'].push(t);
        }
    }
    return g;
}

type TasksPageProps = {
    onNavigateToContext?: (type: string, id: string) => void;
};

export default function TasksPage({ onNavigateToContext }: TasksPageProps) {
    type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
    const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

    const { loading, error, rows, refetch } = useTasks(statusFilter === "all" ? null : statusFilter, 200);

    // Optimistic UI state
    const [actingMap, setActingMap] = useState<Record<string, boolean>>({});
    const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
    const [createOpen, setCreateOpen] = useState(false);

    // Toast notification state
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Undo state
    const [undo, setUndo] = useState<{
        taskId: string;
        prevStatus: TaskStatus;
        expiresAt: number;
    } | null>(null);

    useEffect(() => {
        if (!undo) return;
        const ms = Math.max(0, undo.expiresAt - Date.now());
        const t = setTimeout(() => setUndo(null), ms);
        return () => clearTimeout(t);
    }, [undo]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(t);
    }, [toast]);

    const meta = useMemo(() => {
        const pending = rows.filter((r) => r.status === "pending").length;
        const inProgress = rows.filter((r) => r.status === "in_progress").length;
        return { pending, inProgress, total: rows.length };
    }, [rows]);

    const tasksSorted = useMemo(() => [...rows].sort(sortByBucketAndDue), [rows]);

    const tasksView = useMemo(() => {
        return tasksSorted.map((t) => {
            const overridden = statusOverride[t.id];
            return overridden ? { ...t, status: overridden } : t;
        });
    }, [tasksSorted, statusOverride]);

    const taskGroups = useMemo(() => groupByBucket(tasksView), [tasksView]);

    const filteredGroups = useMemo(() => {
        const out: any = {};
        for (const k of bucketOrder) {
            const itemsInBucket = taskGroups[k] || [];

            if (statusFilter === "all") {
                out[k] = itemsInBucket;
            } else {
                out[k] = itemsInBucket.filter((t: DashboardTask) => t.status === statusFilter);
            }
        }
        return out;
    }, [taskGroups, statusFilter]);

    const totalFiltered = useMemo(() => {
        return bucketOrder.reduce((sum, k) => sum + ((filteredGroups as any)[k]?.length ?? 0), 0);
    }, [filteredGroups]);

    const updateStatus = async (
        taskId: string,
        nextStatus: TaskStatus
    ) => {
        setActionError(null);
        if (actingMap[taskId]) return;

        const prev = (statusOverride[taskId] as TaskStatus | undefined) ??
            (rows.find((x) => x.id === taskId)?.status as TaskStatus | undefined) ??
            "pending";

        setActingMap((m) => ({ ...m, [taskId]: true }));
        setStatusOverride((m) => ({ ...m, [taskId]: nextStatus }));

        if (nextStatus === "cancelled") {
            setUndo({
                taskId,
                prevStatus: prev,
                expiresAt: Date.now() + 5000,
            });
            setToast({ type: "success", msg: "ยกเลิกแล้ว (Undo ได้ 5 วิ)" });
        }

        try {
            const { error } = await supabase.rpc("update_task_status_v1", {
                p_task_id: taskId,
                p_status: nextStatus,
            });
            if (error) throw error;

            if (nextStatus !== "cancelled") {
                setToast({ type: "success", msg: "อัปเดตสถานะเรียบร้อย" });
            }
            refetch();
        } catch (e: any) {
            setStatusOverride((m) => {
                const copy = { ...m };
                copy[taskId] = prev;
                return copy;
            });
            if (nextStatus === "cancelled") setUndo(null);
            const msg = e?.message ?? "ทำรายการไม่สำเร็จ";
            setActionError(msg);
            setToast({ type: "error", msg });
        } finally {
            setActingMap((m) => {
                const c = { ...m };
                delete c[taskId];
                return c;
            });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-4 relative">
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 rounded-2xl border px-4 py-3 text-sm shadow-sm flex items-center gap-3 ${toast.type === "success"
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : "border-rose-100 bg-rose-50 text-rose-800"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        )}
                        {toast.msg}
                    </div>

                    {undo && Date.now() < undo.expiresAt && (
                        <button
                            className="rounded-full border bg-white hover:bg-slate-50 px-3 py-1 text-sm text-slate-700"
                            onClick={async () => {
                                const { taskId, prevStatus } = undo;
                                setUndo(null);
                                await updateStatus(taskId, prevStatus);
                            }}
                        >
                            Undo
                        </button>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-xl font-semibold text-slate-900">Tasks</div>
                    <div className="text-sm text-slate-500">
                        pending {meta.pending} • in progress {meta.inProgress} • ทั้งหมด {meta.total}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 text-sm font-medium transition-colors"
                        onClick={() => setCreateOpen(true)}
                        disabled={loading}
                    >
                        + New Task
                    </button>

                    <button
                        className="inline-flex items-center justify-center rounded-full border bg-white hover:bg-slate-50 h-9 px-4 text-sm font-medium transition-colors"
                        onClick={refetch}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                    <a
                        href="?page=dashboard"
                        className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
                    >
                        กลับ Dashboard
                    </a>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2">
                {(["all", "pending", "in_progress", "completed", "cancelled"] as const).map((k) => (
                    <button
                        key={k}
                        className={`h-9 px-4 rounded-full border text-sm transition-colors ${statusFilter === k ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                        onClick={() => setStatusFilter(k)}
                    >
                        {k === "all" ? "ทั้งหมด" : statusLabel[k]}
                    </button>
                ))}
                <div className="ml-auto text-sm text-slate-500 self-center">
                    แสดง {totalFiltered} รายการ
                </div>
            </div>

            {/* Error Message */}
            {actionError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                    ทำรายการไม่สำเร็จ: {actionError}
                </div>
            )}

            {/* States */}
            {loading && (
                <div className="rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500 bg-white">
                    กำลังโหลดรายการ...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                    โหลดรายการไม่สำเร็จ: {error}
                    <div className="mt-2 text-rose-600 cursor-pointer underline" onClick={refetch}>ลองกด Refresh อีกครั้ง</div>
                </div>
            )}

            {!loading && !error && totalFiltered === 0 && (
                <div className="rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500 bg-white">
                    ยังไม่มีงานในเงื่อนไขที่เลือก
                </div>
            )}

            {/* Groups */}
            {!loading && !error && totalFiltered > 0 && (
                <div className="space-y-6">
                    {bucketOrder.map((bucket) => {
                        const items: DashboardTask[] = (filteredGroups as any)[bucket] ?? [];
                        if (!items.length) return null;

                        return (
                            <section key={bucket} className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-sm font-bold text-slate-700">
                                        {bucketLabel[bucket]}
                                    </div>
                                    <div className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{items.length}</div>
                                </div>

                                <div className="space-y-3">
                                    {items.map((t) => {
                                        const tv = t;
                                        const title = tv.notes?.trim() ? tv.notes : taskTypeLabel(tv.task_type);
                                        const badge = statusLabel[tv.status] ?? tv.status;
                                        const busy = !!actingMap[tv.id];
                                        const hasContext = !!tv.context_type;

                                        return (
                                            <div
                                                key={tv.id}
                                                className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shadow-sm hover:shadow-md transition-shadow relative"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="font-semibold text-slate-900 truncate">{title}</div>
                                                        {hasContext && tv.context_id && (
                                                            <button
                                                                onClick={() => onNavigateToContext?.(tv.context_type!, tv.context_id!)}
                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors uppercase tracking-wide"
                                                                title={`Go to ${tv.context_type}`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                                {tv.context_type?.toUpperCase()}
                                                            </button>
                                                        )}
                                                        {hasContext && !tv.context_id && (
                                                            <button
                                                                onClick={() => onNavigateToContext?.(tv.context_type!, "")}
                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors uppercase tracking-wide"
                                                            >
                                                                {tv.context_type?.toUpperCase()}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-[12px] text-slate-500 font-medium truncate max-w-[250px] flex items-center gap-1">
                                                        {hasContext && tv.context_id ? (
                                                            <>
                                                                <span className="text-slate-400">ID:</span> {tv.context_id}
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400">{taskTypeLabel(tv.task_type)}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[12px] text-slate-500 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                                        <span className="whitespace-nowrap">กำหนด: {fmtDateTH(tv.due_date)}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="whitespace-nowrap font-medium text-slate-600">{taskTypeLabel(tv.task_type)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 justify-end mt-2 sm:mt-0">
                                                    <span className={`inline-flex items-center justify-center rounded-full border h-9 px-3 text-xs whitespace-nowrap min-w-[92px] ${tv.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                        tv.status === 'in_progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                            tv.status === 'cancelled' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                                                'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        {badge}
                                                    </span>

                                                    {tv.status !== "completed" && tv.status !== "cancelled" && (
                                                        <>
                                                            <button
                                                                className="inline-flex items-center justify-center rounded-full border bg-white hover:bg-slate-50 h-9 px-3 text-sm whitespace-nowrap min-w-[72px] disabled:opacity-50 transition-colors"
                                                                disabled={busy || tv.status !== "pending"}
                                                                onClick={() => updateStatus(tv.id, "in_progress")}
                                                            >
                                                                {busy && tv.status === "pending" ? "..." : "เริ่มทำ"}
                                                            </button>

                                                            <button
                                                                className="inline-flex items-center justify-center rounded-full border bg-white hover:bg-slate-50 h-9 px-3 text-sm whitespace-nowrap min-w-[72px] disabled:opacity-50 transition-colors"
                                                                disabled={busy || tv.status !== "in_progress"}
                                                                onClick={() => updateStatus(tv.id, "completed")}
                                                            >
                                                                {busy && tv.status === "in_progress" ? "..." : "เสร็จแล้ว"}
                                                            </button>

                                                            <button
                                                                className="inline-flex items-center justify-center rounded-full border bg-white hover:bg-slate-50 h-9 px-3 text-sm whitespace-nowrap min-w-[72px] disabled:opacity-50 transition-colors"
                                                                disabled={busy || (tv.status !== "pending" && tv.status !== "in_progress")}
                                                                onClick={() => updateStatus(tv.id, "cancelled")}
                                                            >
                                                                ยกเลิก
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <CreateTaskModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreated={() => refetch()}
            />
        </div>
    );
}
