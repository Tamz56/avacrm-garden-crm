import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { X, Loader2, DollarSign, CreditCard, FileText } from "lucide-react";

interface DealPaymentFormModalProps {
    dealId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export const DealPaymentFormModal: React.FC<DealPaymentFormModalProps> = ({
    dealId,
    onClose,
    onSuccess,
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<"transfer" | "cash" | "other">("transfer");
    const [status, setStatus] = useState<"verified" | "pending" | "cancelled">("verified");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.from("deal_payments").insert({
            deal_id: dealId,
            amount,
            method,
            status,
            note,
        });

        setLoading(false);

        if (error) {
            console.error(error);
            setError(error.message);
            return;
        }

        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span>💰</span> บันทึกการชำระเงิน
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                            จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="number"
                                min={0}
                                step={100}
                                required
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Method */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                                วิธีชำระ
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value as any)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                                >
                                    <option value="transfer">โอนเงิน</option>
                                    <option value="cash">เงินสด</option>
                                    <option value="other">อื่น ๆ</option>
                                </select>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                                สถานะ
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            >
                                <option value="verified">✅ ยืนยันแล้ว</option>
                                <option value="pending">⏳ รอตรวจสอบ</option>
                                <option value="cancelled">❌ ยกเลิก</option>
                            </select>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                            หมายเหตุ / หลักฐาน
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]"
                                placeholder="รายละเอียดเพิ่มเติม..."
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                            <span className="mt-0.5">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading || amount <= 0}
                            className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            บันทึกยอดเงิน
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
