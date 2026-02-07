import React, { useMemo, useState } from "react";
import { Layers, ChevronDown, Tag, AlertTriangle, Camera, ClipboardCheck } from "lucide-react";

type OpsSnapshotProps = {
    stats?: Record<string, any>;
    alerts?: any[];
    loading?: boolean;
};

const SURFACE =
    "rounded-2xl border border-slate-200/70 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] " +
    "backdrop-blur supports-[backdrop-filter]:bg-white/75 " +
    "dark:border-white/10 dark:bg-[#0b1220]/55 dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]";

const TITLE = "text-slate-900 dark:text-slate-100 font-semibold tracking-tight";
const MUTED = "text-slate-500 dark:text-slate-400";

function pickNumber(obj: Record<string, any>, keys: string[], fallback = 0) {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === "number" && !Number.isNaN(v)) return v;
    }
    return fallback;
}

function Tile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm
                    dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center
                        dark:bg-white/10 dark:text-slate-200">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className={"text-[11px] leading-4 " + MUTED}>{label}</div>
                    <div className={"text-base font-bold tabular-nums " + TITLE}>{value.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}

export default function OpsSnapshot({
    stats = {},
    alerts = [],
    loading = false,
}: OpsSnapshotProps) {
    const [open, setOpen] = useState(false);

    // พยายาม “เดาคีย์” ให้ทนต่อ schema ที่ต่างกัน
    const untagged = useMemo(
        () => pickNumber(stats, ["untagged", "untagged_count", "untagged_qty", "untagged_total"], 0),
        [stats]
    );
    const pendingQA = useMemo(
        () => pickNumber(stats, ["qa_pending", "pending_qa", "qa_pending_count", "qa_pending_qty"], 0),
        [stats]
    );
    const pendingPhoto = useMemo(
        () => pickNumber(stats, ["photo_pending", "pending_photo", "photo_pending_count", "photo_pending_qty"], 0),
        [stats]
    );

    const alertsCount = alerts?.length ?? pickNumber(stats, ["alerts", "alerts_count"], 0);

    return (
        <div className={`${SURFACE} px-5 py-4`}>
            {/* Header */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3"
            >
                <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center
                          dark:bg-indigo-500/15 dark:text-indigo-200">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-left">
                        <div className={"text-sm " + TITLE}>Ops Snapshot</div>
                        <div className={"text-xs " + MUTED}>
                            {loading ? "Loading..." : `${untagged.toLocaleString()} untagged · ${alertsCount} alerts`}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 h-9 w-9 rounded-xl border border-slate-200/70 bg-white flex items-center justify-center
                        dark:border-white/10 dark:bg-white/5">
                    <ChevronDown
                        className={
                            "h-4 w-4 text-slate-500 dark:text-slate-300 transition-transform " +
                            (open ? "rotate-180" : "")
                        }
                    />
                </div>
            </button>

            {/* Collapsed Summary (แก้ “โล่ง” ให้มีของเสมอ) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Tile icon={<Tag className="h-4 w-4" />} label="Untagged" value={untagged} />
                <Tile icon={<ClipboardCheck className="h-4 w-4" />} label="QA pending" value={pendingQA} />
                <Tile icon={<Camera className="h-4 w-4" />} label="Photo pending" value={pendingPhoto} />
            </div>

            {/* Expanded Details */}
            <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[520px]" : "max-h-0"}`}>
                <div className="pt-4">
                    <div className={"text-xs mb-2 " + MUTED}>Alerts</div>

                    {loading ? (
                        <div className={"text-sm " + MUTED}>Loading alerts...</div>
                    ) : alertsCount === 0 ? (
                        <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm
                            dark:border-white/10 dark:bg-white/5">
                            <div className={TITLE}>ไม่มี Alerts ตอนนี้</div>
                            <div className={"text-xs mt-1 " + MUTED}>ระบบปกติดี ✅</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {alerts.slice(0, 4).map((a, idx) => (
                                <div
                                    key={a?.id ?? idx}
                                    className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm flex items-start gap-2
                             dark:border-white/10 dark:bg-white/5"
                                >
                                    <div className="mt-0.5 text-rose-600 dark:text-rose-300">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className={TITLE}>{a?.title ?? a?.label ?? a?.message ?? "Alert"}</div>
                                        {a?.detail && <div className={"text-xs mt-0.5 " + MUTED}>{a.detail}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
