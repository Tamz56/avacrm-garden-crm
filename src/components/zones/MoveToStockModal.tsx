import React from "react";
import { supabase } from "../../supabaseClient";
import { Loader2, X, Archive, AlertTriangle } from "lucide-react";

type MoveToStockModalProps = {
    selectedTagIds: string[];
    onClose: () => void;
    onSuccess: () => void;
};

export function MoveToStockModal({ selectedTagIds, onClose, onSuccess }: MoveToStockModalProps) {
    const [note, setNote] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleConfirm = async () => {
        setSaving(true);
        setError(null);

        try {
            console.log("Calling move_tags_to_stock with:", { p_tag_ids: selectedTagIds, p_notes: note });

            const { data, error: rpcError } = await supabase.rpc("move_tags_to_stock", {
                p_tag_ids: selectedTagIds,
                p_notes: note || null, // send null if string is empty
            });

            if (rpcError) {
                console.error("move_tags_to_stock error:", rpcError);
                // Handle specific error message from DB
                if (rpcError.message.includes("not in 'dug' status") || rpcError.message.includes("ไม่อยู่สถานะขุดล้อม")) {
                    setError("มีต้นไม้บางต้นยังไม่อยู่สถานะขุดล้อม (dug)");
                } else {
                    setError(rpcError.message || "เกิดข้อผิดพลาดในการย้ายไม้เข้า Stock");
                }
                return;
            }

            // Success
            alert(`ย้ายไม้เข้า Stock สำเร็จ ${data ?? 0} ต้น`);
            onSuccess();
            onClose();

        } catch (err: any) {
            console.error("Unexpected error:", err);
            setError(err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Archive className="h-5 w-5 text-indigo-600" />
                        ย้ายเข้า Stock
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-lg bg-indigo-50 p-4 border border-indigo-100">
                        <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs">
                                {selectedTagIds.length}
                            </span>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-indigo-900">
                                    คุณกำลังจะย้ายต้นไม้ {selectedTagIds.length} ต้น ไปยัง Stock
                                </p>
                                <p className="text-xs text-indigo-700">
                                    ต้นไม้ต้องมีสถานะ <b>"ขุดแล้ว (dug)"</b> เท่านั้นจึงจะย้ายได้
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            หมายเหตุ (ถ้ามี)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder="ระบุสาเหตุ หรือข้อมูลเพิ่มเติม..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-800 disabled:opacity-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? "กำลังดำเนินการ..." : "ยืนยันการย้าย"}
                    </button>
                </div>
            </div>
        </div>
    );
}
