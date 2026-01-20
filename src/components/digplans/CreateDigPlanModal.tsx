"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (v: {
        status: "planned" | "in_progress";
        confidence_level: "low" | "medium" | "high";
        plan_reason: string;
        notes: string;
        target_date_from: string | null;
        target_date_to: string | null;
    }) => Promise<void>;
};

export default function CreateDigPlanModal({ open, onClose, onSubmit }: Props) {
    const [status, setStatus] = useState<"planned" | "in_progress">("planned");
    const [confidence, setConfidence] = useState<"low" | "medium" | "high">("medium");
    const [planReason, setPlanReason] = useState("");
    const [notes, setNotes] = useState("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    const [saving, setSaving] = useState(false);
    const invalidRange = from && to && to < from;
    const canSubmit = !saving && !invalidRange;

    if (!open) return null;

    async function handleSubmit() {
        if (!canSubmit) return;
        setSaving(true);
        try {
            await onSubmit({
                status,
                confidence_level: confidence,
                plan_reason: planReason.trim(),
                notes: notes.trim(),
                target_date_from: from ? from : null,
                target_date_to: to ? to : null,
            });
            // Reset form
            setStatus("planned");
            setConfidence("medium");
            setPlanReason("");
            setNotes("");
            setFrom("");
            setTo("");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border p-5">
                <div className="text-lg font-semibold">สร้าง Dig Plan ใหม่</div>
                <div className="text-sm text-slate-500 mt-1">
                    สร้างแผนขุดก่อน แล้วค่อย Add items และ Promote ไปเป็นคำสั่งขุด
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-slate-500 mb-1">Status</div>
                        <select
                            className="w-full rounded-xl border px-3 py-2"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            disabled={saving}
                        >
                            <option value="planned">planned</option>
                            <option value="in_progress">in_progress</option>
                        </select>
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1">Confidence</div>
                        <select
                            className="w-full rounded-xl border px-3 py-2"
                            value={confidence}
                            onChange={(e) => setConfidence(e.target.value as any)}
                            disabled={saving}
                        >
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 mb-1">Reason</div>
                        <input
                            className="w-full rounded-xl border px-3 py-2"
                            placeholder="เช่น เตรียมขุดส่งลูกค้า, แผนขุดเข้าพาเนล..."
                            value={planReason}
                            onChange={(e) => setPlanReason(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1">Target from (optional)</div>
                        <input
                            className="w-full rounded-xl border px-3 py-2"
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <div className="text-xs text-slate-500 mb-1">Target to (optional)</div>
                        <input
                            className="w-full rounded-xl border px-3 py-2"
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <div className="text-xs text-slate-500 mb-1">Notes</div>
                        <textarea
                            className="w-full rounded-xl border px-3 py-2 min-h-[90px]"
                            placeholder="หมายเหตุเพิ่มเติม"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    {invalidRange && (
                        <div className="md:col-span-2 text-xs text-red-600">
                            ⚠️ ช่วงวันที่ไม่ถูกต้อง (target_to ต้อง &gt;= target_from)
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        className="rounded-xl border px-4 py-2 hover:bg-slate-50"
                        onClick={onClose}
                        disabled={saving}
                    >
                        ยกเลิก
                    </button>
                    <button
                        className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-60 hover:bg-slate-800 flex items-center gap-2"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "สร้างแผน"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
