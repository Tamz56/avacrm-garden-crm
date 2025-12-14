// src/components/customers/CustomerActivityModal.tsx
import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "../../supabaseClient";

const ACTIVITY_TYPES = [
    { value: "call", label: "โทรคุย (Call)" },
    { value: "line", label: "แชท / LINE" },
    { value: "meeting", label: "นัดเจอ / ดูหน้างาน" },
    { value: "followup", label: "ติดตามผล (Follow-up)" },
    { value: "note", label: "บันทึกโน้ตภายใน" },
];

const CHANNEL_TYPES = [
    { value: "phone", label: "โทรศัพท์" },
    { value: "line", label: "LINE" },
    { value: "onsite", label: "On-site" },
    { value: "email", label: "อีเมล" },
];

type QuickTemplate = {
    id: string;
    label: string;
    activity_type: string;
    channel: string;
    summary: string;
};

const QUICK_TEMPLATES: QuickTemplate[] = [
    {
        id: "follow_price",
        label: "โทรตามสรุปราคา",
        activity_type: "call",
        channel: "phone",
        summary: "โทรติดตามผลใบเสนอราคา / สอบถามการตัดสินใจ",
    },
    {
        id: "send_tree_photos",
        label: "ส่งรูปต้นไม้ให้ลูกค้า",
        activity_type: "line",
        channel: "line",
        summary: "ส่งรูปต้นไม้ / วิดีโอให้ลูกค้าเพื่อประกอบการตัดสินใจ",
    },
    {
        id: "negotiate",
        label: "เจรจาต่อรองราคา",
        activity_type: "followup",
        channel: "phone",
        summary: "พูดคุยเรื่องส่วนลด / เงื่อนไขการชำระเงินเพิ่มเติม",
    },
    {
        id: "after_service",
        label: "ติดตามหลังปลูก",
        activity_type: "followup",
        channel: "phone",
        summary: "ติดตามผลการปลูก / การดูแลต้นไม้หลังส่งมอบ",
    },
];

export type CustomerActivityRow = {
    id: string;
    customer_id: string;
    deal_id: string | null;
    activity_type: string;
    channel: string | null;
    summary: string;   // สรุปสั้นๆ (NOT NULL)
    note: string | null;
    activity_date: string; // ISO string
    created_at: string;
    deal_code?: string | null;
    deal_title?: string | null;
    deal_total_amount?: number | null;
};

type DealOption = {
    id: string;
    code: string | null;
    title: string | null;
};

type Props = {
    open: boolean;
    customerId: string;
    onClose: () => void;
    onSaved: () => void;
    activity?: CustomerActivityRow | null; // ถ้ามี = โหมดแก้ไข
};

export const CustomerActivityModal: React.FC<Props> = ({
    open,
    customerId,
    onClose,
    onSaved,
    activity,
}) => {
    const isEdit = !!activity;

    const [loading, setLoading] = useState(false);
    const [deals, setDeals] = useState<DealOption[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        deal_id: "" as string | "",
        activity_type: "call",
        channel: "phone",
        summary: "",
        note: "",
        activity_date: new Date().toISOString().slice(0, 16), // สำหรับ input type="datetime-local"
    });

    // โหลดดีลของลูกค้ารายนี้ (ไว้ผูกกับกิจกรรม)
    useEffect(() => {
        if (!open) return;

        const loadDeals = async () => {
            const { data, error } = await supabase
                .from("deals")
                .select("id, code, title")
                .eq("customer_id", customerId)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setDeals(data as DealOption[]);
            }
        };

        loadDeals();
    }, [open, customerId]);

    // ถ้าเป็นโหมดแก้ไข ให้เซ็ตค่าเริ่มต้นจาก activity
    useEffect(() => {
        if (!open) return;

        if (activity) {
            setForm({
                deal_id: activity.deal_id || "",
                activity_type: activity.activity_type || "call",
                channel: activity.channel || "phone",
                summary: activity.summary || "",
                note: activity.note || "",
                activity_date: activity.activity_date
                    ? activity.activity_date.slice(0, 16)
                    : new Date().toISOString().slice(0, 16),
            });
        } else {
            // reset ถ้าเป็นโหมดสร้างใหม่
            setForm({
                deal_id: "",
                activity_type: "call",
                channel: "phone",
                summary: "",
                note: "",
                activity_date: new Date().toISOString().slice(0, 16),
            });
        }
        setError(null);
    }, [open, activity]);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.summary.trim()) {
            setError("กรุณากรอกสรุปเหตุการณ์สั้นๆ (Summary)");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customer_id: customerId,
                deal_id: form.deal_id || null,
                activity_type: form.activity_type,
                channel: form.channel || null,
                summary: form.summary.trim(),
                note: form.note.trim() || null,
                activity_date: new Date(form.activity_date).toISOString(),
            };

            let dbError;
            if (isEdit) {
                const { error } = await supabase
                    .from("customer_activities")
                    .update(payload)
                    .eq("id", activity!.id);
                dbError = error;
            } else {
                const { error } = await supabase
                    .from("customer_activities")
                    .insert(payload);
                dbError = error;
            }

            if (dbError) throw dbError;

            onSaved(); // ให้ parent reload timeline
            onClose();
        } catch (err: any) {
            console.error("Save activity error:", err);
            setError(err.message || "ไม่สามารถบันทึกกิจกรรมได้");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {isEdit ? "แก้ไขกิจกรรมลูกค้า" : "บันทึกกิจกรรมลูกค้า"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                ประเภทกิจกรรม
                            </label>
                            <select
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2"
                                value={form.activity_type}
                                onChange={(e) => handleChange("activity_type", e.target.value)}
                            >
                                {ACTIVITY_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                ช่องทาง
                            </label>
                            <select
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2"
                                value={form.channel}
                                onChange={(e) => handleChange("channel", e.target.value)}
                            >
                                {CHANNEL_TYPES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            ผูกกับดีล (ถ้ามี)
                        </label>
                        <select
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2"
                            value={form.deal_id}
                            onChange={(e) => handleChange("deal_id", e.target.value)}
                        >
                            <option value="">- ไม่ผูกกับดีล -</option>
                            {deals.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.code || d.title || d.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            วันที่ & เวลา
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2"
                            value={form.activity_date}
                            onChange={(e) => handleChange("activity_date", e.target.value)}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                                สรุปเหตุการณ์ (Summary) *
                            </label>
                            <span className="text-[10px] text-slate-400">Template กดครั้งเดียวเติมข้อความ</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                            {QUICK_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => {
                                        setForm((prev) => ({
                                            ...prev,
                                            activity_type: tpl.activity_type,
                                            channel: tpl.channel,
                                            summary: tpl.summary,
                                        }));
                                    }}
                                    className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2"
                            placeholder="เช่น โทรคุยเรื่องเลื่อนส่งต้นไม้ / ขอราคาเพิ่ม"
                            value={form.summary}
                            onChange={(e) => handleChange("summary", e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            รายละเอียดเพิ่มเติม (Optional)
                        </label>
                        <textarea
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2 min-h-[80px]"
                            value={form.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-xs text-white font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isEdit ? "บันทึกการแก้ไข" : "บันทึกกิจกรรม"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
