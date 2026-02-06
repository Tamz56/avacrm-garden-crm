// src/components/billing/PaymentModal.tsx
// Modal สำหรับ Add Payment
import React, { useState } from 'react';
import { X, DollarSign, Loader2, CreditCard, Banknote, Building2 } from 'lucide-react';
import { useAddDealDocumentPayment } from '../../hooks/useDealDocumentPayments';
import type { DocRow } from '../../hooks/useDealDocumentsFinancial';

type Props = {
    doc: DocRow;
    onClose: () => void;
    onSuccess: () => void;
};

const PAYMENT_METHODS = [
    { value: 'transfer', label: 'โอนเงิน', icon: Building2 },
    { value: 'cash', label: 'เงินสด', icon: Banknote },
    { value: 'check', label: 'เช็ค', icon: CreditCard },
    { value: 'other', label: 'อื่นๆ', icon: DollarSign },
];

export default function PaymentModal({ doc, onClose, onSuccess }: Props) {
    const [amount, setAmount] = useState(doc.balance || 0);
    const [method, setMethod] = useState('transfer');
    const [note, setNote] = useState('');
    const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);

    const { addPayment, loading, error } = useAddDealDocumentPayment();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) return;

        const success = await addPayment(doc.id, amount, method, note, paidAt);
        if (success) {
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden dark:bg-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            บันทึกรับชำระ
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.doc_no}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Summary Card */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">ยอดรวม</span>
                            <span className="font-bold">฿{doc.grand_total?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">รับแล้ว</span>
                            <span className="font-bold text-emerald-600">฿{doc.paid_total?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
                            <span className="text-slate-500">คงเหลือ</span>
                            <span className="font-black text-lg text-amber-600">฿{doc.balance?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                            จำนวนเงินที่รับ
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                min={0}
                                max={doc.balance || undefined}
                                step={0.01}
                                className="w-full h-12 pl-10 pr-4 text-lg font-bold border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:border-emerald-500 outline-none transition-all"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setAmount(doc.balance || 0)}
                                className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-bold"
                            >
                                เต็มจำนวน
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(Math.round((doc.grand_total || 0) * 0.5))}
                                className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(Math.round((doc.grand_total || 0) * 0.3))}
                                className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-bold"
                            >
                                30%
                            </button>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                            ช่องทาง
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {PAYMENT_METHODS.map((m) => {
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setMethod(m.value)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${method === m.value
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-[10px] font-bold">{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Paid At */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                            วันที่รับเงิน
                        </label>
                        <input
                            type="date"
                            value={paidAt}
                            onChange={(e) => setPaidAt(e.target.value)}
                            className="w-full h-11 px-4 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full h-11 px-4 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:border-emerald-500 outline-none transition-all"
                            placeholder="เช่น เลขที่ slip, ชื่อผู้โอน"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || amount <= 0}
                        className="w-full h-12 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <DollarSign className="h-5 w-5" />
                                บันทึกรับเงิน ฿{amount.toLocaleString()}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
