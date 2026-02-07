
import React, { useMemo, useState } from "react";
import { useDashboardTasks, DashboardTask } from "../../hooks/useDashboardTasks";
import {
    ChevronRight,
    ListChecks,
    PhoneCall,
    Sprout,
    MapPin,
    FileText,
    Truck,
    CreditCard,
} from "lucide-react";
import { PREMIUM_STYLES } from "../../constants/ui";

// Style Constants
const { SURFACE, SURFACE_HOVER, TITLE, MUTED, SOFT_INNER } = PREMIUM_STYLES;


const fmtDue = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
    }).format(d);
};

const isOverdue = (iso?: string | null, status?: string) => {
    if (!iso || status !== "pending") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d < today;
};

const statusLabel = (s: string) => {
    switch (s) {
        case "pending": return "รอดำเนินการ";
        case "in_progress": return "กำลังทำ";
        case "completed": return "เสร็จแล้ว";
        case "cancelled": return "ยกเลิก";
        default: return s;
    }
};

const statusPillClass = (s: string) => {
    if (s === "completed") return "bg-emerald-50/60 text-emerald-700 border-emerald-200/60";
    if (s === "in_progress") return "bg-amber-50/60 text-amber-700 border-amber-200/60";
    if (s === "cancelled") return "bg-slate-100/60 text-slate-600 border-slate-200/60";
    return "bg-slate-50/60 text-slate-600 border-slate-200/70";
};

const taskIcon = (taskType?: string) => {
    const className = "h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors";
    switch (taskType) {
        case "follow_up": return <PhoneCall className={className} />;
        case "planting_followup": return <Sprout className={className} />;
        case "site_visit": return <MapPin className={className} />;
        case "quote": return <FileText className={className} />;
        case "delivery": return <Truck className={className} />;
        case "payment_followup": return <CreditCard className={className} />;
        default: return <ListChecks className={className} />;
    }
};

const TASK_TYPE_LABEL: Record<string, string> = {
    follow_up: "ติดตามลูกค้า",
    planting_followup: "ติดตามหลังปลูก",
    site_visit: "นัดเข้าหน้างาน",
    quote: "ทำใบเสนอราคา",
    delivery: "นัดส่ง/ขนส่ง",
    payment_followup: "ติดตามชำระเงิน",
    general: "งานทั่วไป",
};
const taskTypeLabel = (k?: string | null) => TASK_TYPE_LABEL[k || ""] ?? (k || "งาน");

// ---- Accent interaction states


// ---- Due label helpers (Today / Tomorrow / Overdue)
function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dueLabel(dueDate: string | null, status?: string) {
    if (!dueDate) return { label: null as string | null, isOverdue: false };

    // (optional) ถ้า task ปิดแล้ว ไม่ต้องตีว่า overdue
    const st = (status || "").toLowerCase();
    const isClosed = st === "done" || st === "completed" || st === "cancelled" || st === "canceled";
    if (isClosed) return { label: null as string | null, isOverdue: false };

    const due = startOfDay(new Date(dueDate));
    const today = startOfDay(new Date());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    if (due.getTime() < today.getTime()) return { label: "เกินกำหนด", isOverdue: true };
    if (due.getTime() === today.getTime()) return { label: "วันนี้", isOverdue: false };
    if (due.getTime() === tomorrow.getTime()) return { label: "พรุ่งนี้", isOverdue: false };

    return { label: null as string | null, isOverdue: false };
}

function accentTone(due: { label: string | null; isOverdue: boolean }) {
    // premium tones (ไม่ระบุสีอื่นนอกจาก tailwind class)
    if (due.isOverdue) return "from-rose-500/80 via-rose-400/70 to-rose-300/40";
    if (due.label === "วันนี้") return "from-amber-500/70 via-amber-400/60 to-amber-300/30";
    if (due.label === "พรุ่งนี้") return "from-emerald-500/60 via-emerald-400/50 to-emerald-300/25";
    return "from-slate-300/40 via-slate-200/30 to-transparent";
}

const ContextCapsule = ({ type, id }: { type?: string | null; id?: string | null }) => {
    if (!type) return null;
    const t = type.toUpperCase();
    const short = id ? id.slice(0, 6).toUpperCase() : "GENERAL";
    return (
        <span className="ml-2 inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50/60 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-slate-600">
            {t} · {short}
        </span>
    );
};

export default function DashboardPriorityTasksCard({ onOpenTasks }: { onOpenTasks?: () => void }) {
    // ---- Accent interaction states
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const { loading, error, refetch, tasksSorted } = useDashboardTasks(50);

    const handleNavigate = (t: DashboardTask) => {
        if (t.context_type === 'stock' && !t.context_id) {
            window.location.search = '?page=stock';
            return;
        }
        // Logic for other types if needed, or default behavior
        // For now, we keep it safe. If specific deal navigation is needed:
        if (t.context_type === 'deal' && t.context_id) {
            // Example: window.location.href = `?page=deals&id=${t.context_id}`;
            // But avoiding hard reload if not sure. 
            // Since user said "onClick ให้เรียก handler เดิม", and I am adding this newly,
            // I will leave standard navigation open or strictly follow the stock rule asked.
        }
    };

    const top5 = useMemo(() => {
        const score = (t: DashboardTask) => {
            const d = dueLabel(t.due_date, t.status);
            const overdue = d.isOverdue ? 1 : 0;
            const due = t.due_date ? new Date(t.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            return { overdue, due };
        };
        return [...tasksSorted]
            .sort((a, b) => {
                const sa = score(a);
                const sb = score(b);
                if (sa.overdue !== sb.overdue) return sb.overdue - sa.overdue;
                return sa.due - sb.due;
            })
            .slice(0, 5);
    }, [tasksSorted]);

    const { pendingCount, inProgressCount, overdueCount } = top5.reduce(
        (acc, t) => {
            if (t.status === "pending") acc.pendingCount += 1;
            if (t.status === "in_progress") acc.inProgressCount += 1;
            if (isOverdue(t.due_date, t.status)) acc.overdueCount += 1;
            return acc;
        },
        { pendingCount: 0, inProgressCount: 0, overdueCount: 0 }
    );

    return (
        <div className={`${SURFACE} ${SURFACE_HOVER} p-5 h-full flex flex-col`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-100">
                        <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                        <div className={`text-sm ${TITLE} leading-tight`}>Priority tasks</div>
                        <div className={`mt-0.5 text-[11px] ${MUTED} font-medium`}>
                            {pendingCount} pending • {inProgressCount} in progress
                            {overdueCount > 0 && (
                                <>
                                    <span className="text-slate-300"> • </span>
                                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50/70 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                                        เกินกำหนด {overdueCount}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onOpenTasks}
                        className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                        type="button"
                    >
                        ดูทั้งหมด
                    </button>
                    <button
                        onClick={refetch}
                        className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                        type="button"
                        disabled={loading}
                    >
                        {loading ? "..." : "Refresh"}
                    </button>
                </div>
            </div>

            <div className={`mt-0 flex-1 min-h-0 relative ${SOFT_INNER} overflow-hidden shadow-sm`}>
                {loading && <div className="p-4 text-slate-400 text-sm text-center">กำลังโหลดงาน...</div>}
                {!loading && error && <div className="p-4 text-rose-600 text-sm text-center">{error}</div>}

                {!loading && !error && (
                    <div className="max-h-[420px] overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                        <div className="divide-y divide-slate-100/70">
                            {top5.map((t) => {
                                const title = (t.notes && t.notes.trim()) ? t.notes : taskTypeLabel(t.task_type);

                                const due = dueLabel(t.due_date, t.status);
                                const overdue = due.isOverdue; // ใช้ตัวเดียวกับ label
                                const tone = accentTone(due);

                                const isHover = hoverId === t.id;
                                const isActive = activeId === t.id;

                                return (
                                    <div
                                        key={t.id}
                                        className={[
                                            "group relative flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0",
                                            "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5",
                                        ].join(" ")}
                                        onMouseEnter={() => setHoverId(t.id)}
                                        onMouseLeave={() => setHoverId((prev) => (prev === t.id ? null : prev))}
                                        onClick={() => {
                                            setActiveId(t.id);
                                            handleNavigate(t);
                                        }}
                                        title="เปิดไปยังรายการที่เกี่ยวข้อง"
                                    >
                                        {/* Accent Bar (always visible + reactive) */}
                                        <span
                                            className={[
                                                "absolute left-0 top-0 h-full w-[3px] rounded-r",
                                                "bg-gradient-to-b",
                                                tone,
                                                "transition-all duration-200",
                                                // base
                                                overdue ? "opacity-100" : "opacity-55",
                                                // hover / active feedback
                                                (isHover || isActive) ? "opacity-100 scale-x-110" : "",
                                                // subtle glow (premium)
                                                (isHover || isActive)
                                                    ? (overdue ? "shadow-[0_0_10px_rgba(244,63,94,0.22)]"
                                                        : "shadow-[0_0_10px_rgba(99,102,241,0.12)]")
                                                    : "",
                                            ].join(" ")}
                                        />

                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-amber-500 transition-colors">
                                            {taskIcon(t.task_type)}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center flex-wrap gap-y-1">
                                                <div className={`truncate text-[13px] font-medium leading-tight ${TITLE} group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors mr-1`}>
                                                    {title}
                                                </div>
                                                <ContextCapsule type={t.context_type} id={t.context_id} />
                                            </div>

                                            <div className={`mt-0.5 flex items-center gap-2 text-[11px] ${MUTED} leading-tight`}>
                                                <span>
                                                    Due: {fmtDue(t.due_date)}
                                                    {due.label && (
                                                        <span
                                                            className={[
                                                                "ml-2 inline-flex items-center rounded-full border px-1.5 py-[1px] text-[10px] leading-none",
                                                                due.isOverdue
                                                                    ? "border-rose-200/70 bg-rose-50/60 text-rose-700"
                                                                    : due.label === "วันนี้"
                                                                        ? "border-amber-200/70 bg-amber-50/60 text-amber-700"
                                                                        : "border-emerald-200/70 bg-emerald-50/60 text-emerald-700",
                                                            ].join(" ")}
                                                        >
                                                            {due.label}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="text-slate-300">•</span>
                                                <span className="truncate">{taskTypeLabel(t.task_type)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pl-2 sm:pl-0">
                                            <span
                                                className={[
                                                    "rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap min-w-[70px] text-center",
                                                    statusPillClass(t.status),
                                                ].join(" ")}
                                            >
                                                {statusLabel(t.status)}
                                            </span>

                                            <ChevronRight className="h-4 w-4 translate-x-[-4px] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 text-slate-300" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {top5.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                                <ListChecks className="w-8 h-8 opacity-20" />
                                <span className="text-sm">ไม่มีงานที่ต้องทำตอนนี้</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
