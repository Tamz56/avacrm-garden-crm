import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Loader2 } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated?: (taskId: string) => void;

    // Context-Aware Props
    initialContextType?: string | null;  // 'deal' | 'customer' | 'zone' | 'tag'
    initialContextId?: string | null;
    initialContextLabel?: string | null; // e.g. "Deal: D-2024-001" or "Customer: Somchai"
    lockContext?: boolean;               // if true, cannot change context (default true if initialContext provided)
};

type Toast = { type: "success" | "error"; msg: string } | null;

const TASK_TYPES: Array<{ value: string; label: string }> = [
    { value: "follow_up", label: "ติดตาม (Follow-up)" },
    { value: "planting_followup", label: "ติดตามหลังปลูก (7 วัน)" },
    { value: "site_visit", label: "นัดเข้าหน้างาน/สำรวจพื้นที่" },
    { value: "quote", label: "ทำใบเสนอราคา" },
    { value: "delivery", label: "นัดส่ง/ขนส่ง" },
    { value: "payment_followup", label: "ติดตามชำระเงิน" },
    { value: "general", label: "งานทั่วไป" },
];

function toISODateInput(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function CreateTaskModal({
    open,
    onClose,
    onCreated,
    initialContextType = null,
    initialContextId = null,
    initialContextLabel = null,
    lockContext = true,
}: Props) {
    const [taskType, setTaskType] = useState<string>("follow_up");
    const [dueDate, setDueDate] = useState<string>(toISODateInput(new Date()));
    const [notes, setNotes] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<Toast>(null);

    // Initial State for Context
    const [contextType, setContextType] = useState<string | null>(initialContextType);
    const [contextId, setContextId] = useState<string | null>(initialContextId);

    const canSave = useMemo(() => {
        return !!taskType && !saving;
    }, [taskType, saving]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (!open) return;
        // Reset form
        setTaskType("follow_up");
        setDueDate(toISODateInput(new Date()));
        setNotes("");
        setToast(null);
        setSaving(false);

        // Sync context from props
        setContextType(initialContextType);
        setContextId(initialContextId);
    }, [open, initialContextType, initialContextId]);

    const handleCreate = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const { data: userRes, error: userErr } = await supabase.auth.getUser();
            if (userErr) throw userErr;
            const uid = userRes?.user?.id;
            if (!uid) throw new Error("No session");

            // Source logic: if context exists, use context_type as source, else 'manual'
            // But RPC default source='manual'. We can pass explicit source.
            const source = contextType ? contextType : "manual";

            const payload = {
                p_task_type: taskType,
                p_status: "pending",
                p_due_date: dueDate || null,
                p_notes: notes?.trim() ? notes.trim() : null,
                p_assigned_to: uid,
                p_context_type: contextType,
                p_context_id: contextId || null,
                p_source: source,
            };

            const { data, error } = await supabase.rpc("create_task_v1", payload);
            if (error) throw error;

            const createdId = (data as any) as string;
            setToast({ type: "success", msg: "สร้างงานเรียบร้อย" });

            onCreated?.(createdId);

            setTimeout(() => onClose(), 200);
        } catch (e: any) {
            setToast({ type: "error", msg: e?.message ?? "สร้างงานไม่สำเร็จ" });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
                onClick={saving ? undefined : onClose}
            />

            {toast && (
                <div
                    className={`fixed top-4 right-4 z-[60] rounded-2xl border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2 ${toast.type === "success"
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : "border-rose-100 bg-rose-50 text-rose-800"
                        }`}
                >
                    {toast.msg}
                </div>
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-xl rounded-3xl bg-white shadow-xl border border-slate-100 transform transition-all scale-100">
                    <div className="px-6 py-5 flex items-start justify-between border-b border-slate-50">
                        <div>
                            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                New Task
                                {contextType && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">
                                        LINKED: {contextType}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-slate-500 mt-0.5">
                                สร้างงานใหม่สำหรับติดตาม/ดำเนินการ
                            </div>
                        </div>
                        <button
                            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                            onClick={onClose}
                            disabled={saving}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="px-6 py-6 space-y-5">
                        {/* Context Display (Locked) */}
                        {(contextType && contextId) && (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-start gap-3">
                                <div className="mt-0.5 text-indigo-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-0.5">
                                        Linked Context ({contextType})
                                    </div>
                                    <div className="text-sm font-medium text-slate-700 truncate">
                                        {initialContextLabel || contextId}
                                    </div>
                                    {lockContext && (
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            * รายการนี้ถูกผูกติดกับบริบทต้นทางอัตโนมัติ
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    ประเภทงาน
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full rounded-2xl border border-slate-200 bg-white h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                                        value={taskType}
                                        onChange={(e) => setTaskType(e.target.value)}
                                        disabled={saving}
                                    >
                                        {TASK_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    วันที่ครบกำหนด
                                </label>
                                <input
                                    type="date"
                                    className="w-full rounded-2xl border border-slate-200 bg-white h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                รายละเอียด / หมายเหตุ
                            </label>
                            <textarea
                                className="w-full rounded-2xl border border-slate-200 bg-white min-h-[100px] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                                placeholder="รายละเอียดเพิ่มเติม..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={saving}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 h-10 px-5 text-sm font-medium text-slate-600 transition-colors disabled:opacity-50"
                                onClick={onClose}
                                disabled={saving}
                            >
                                ยกเลิก
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 text-sm font-medium shadow-lg shadow-slate-200 disabled:opacity-70 transition-all"
                                onClick={handleCreate}
                                disabled={!canSave}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    "บันทึกงาน"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
