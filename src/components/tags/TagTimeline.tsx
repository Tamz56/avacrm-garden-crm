import React from "react";
import { useTagTimeline } from "../../hooks/useTagTimeline";
import { Clock, ArrowRight, User, AlertCircle, MapPin, FileText } from "lucide-react";

type Props = {
    tagId: string;
    limit?: number;
    onOpenDigOrder?: (digOrderId: string) => void;
};

const thDateTime = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

// Helper for safe short ID
const shortId = (id: string | null) => (id ? id.slice(0, 6) : "-");

// Status color helper (basic)
const getStatusColor = (status: string | null) => {
    if (!status) return "bg-slate-100 text-slate-600";
    if (status.includes("ready") || status === "available") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status.includes("reserved")) return "bg-amber-50 text-amber-700 border-amber-100";
    if (status.includes("dig") || status === "dug") return "bg-sky-50 text-sky-700 border-sky-100";
    if (status === "dead" || status === "lost") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
};

export const TagTimeline: React.FC<Props> = ({ tagId, limit = 30, onOpenDigOrder }) => {
    const { data, loading, error } = useTagTimeline(tagId, limit);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-xs">กำลังโหลดประวัติ...</span>
        </div>
    );

    if (error) return (
        <div className="p-4 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            โหลดประวัติไม่สำเร็จ: {error}
        </div>
    );

    if (!data.length) return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
            <Clock className="w-8 h-8 mb-2" />
            <span className="text-sm">ยังไม่มีประวัติ</span>
        </div>
    );

    return (
        <div className="relative border-l border-slate-200 ml-3 space-y-6 py-2 my-2">
            {data.map((e) => {
                const isDig = e.context_type === "dig_order" && !!e.context_id;

                return (
                    <div key={e.event_id} className="relative pl-6 group">
                        {/* Dot */}
                        <div className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white ring-1 transition-all
                            ${e.is_correction ? 'bg-amber-400 ring-amber-100' : 'bg-slate-300 ring-slate-100 group-hover:bg-emerald-400 group-hover:ring-emerald-100'}
                        `}></div>

                        <div className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm transition-shadow hover:shadow-md">
                            {/* Header: Status Change or Event Type */}
                            <div className="flex items-start justify-between gap-3 mb-1">
                                <div className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
                                    {e.from_status && e.to_status ? (
                                        <>
                                            <span className={`px-1.5 py-0.5 rounded text-xs border ${getStatusColor(e.from_status)}`}>
                                                {e.from_status}
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                            <span className={`px-1.5 py-0.5 rounded text-xs border ${getStatusColor(e.to_status)}`}>
                                                {e.to_status}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                            {e.event_type}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {thDateTime(e.event_at)}
                                </span>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                <span className="flex items-center gap-1" title="User">
                                    <User className="w-3 h-3" />
                                    {shortId(e.actor_user_id) || "System"}
                                </span>
                                {e.source && (
                                    <span className="flex items-center gap-1" title="Source">
                                        <MapPin className="w-3 h-3" />
                                        {e.source}
                                    </span>
                                )}
                                {e.is_correction && (
                                    <span className="text-amber-600 bg-amber-50 px-1.5 rounded flex items-center gap-1 border border-amber-100">
                                        <AlertCircle className="w-3 h-3" />
                                        Correction
                                    </span>
                                )}
                            </div>

                            {/* Notes */}
                            {e.notes && (
                                <div className="text-xs text-slate-600 bg-slate-50/50 p-2 rounded-md border border-slate-100 italic">
                                    "{e.notes}"
                                </div>
                            )}

                            {/* Dig Order Link */}
                            {isDig && (
                                <div className="mt-2 flex justify-end">
                                    <button
                                        className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 transition-colors"
                                        onClick={() => onOpenDigOrder?.(e.context_id!)}
                                    >
                                        <FileText className="w-3 h-3" />
                                        ดูใบ Dig Order
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
