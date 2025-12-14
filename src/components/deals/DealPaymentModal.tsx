import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type PaymentFormValues = {
    amount: number;
    payment_date: string;
    method: string;
    payment_type: 'deposit' | 'final';
    note: string;
};

interface DealPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: PaymentFormValues) => Promise<void>;
    loading?: boolean;
    dealTitle?: string;
    mode?: 'create' | 'edit';
    defaultValues?: Partial<PaymentFormValues> & {
        paymentType?: 'deposit' | 'final';
        paymentDate?: string;
    };
}

export const DealPaymentModal: React.FC<DealPaymentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
    dealTitle,
    mode = 'create',
    defaultValues,
}) => {
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<string>('transfer');
    const [type, setType] = useState<'deposit' | 'final'>('final');
    const [note, setNote] = useState<string>('');

    // Reset or populate form when modal opens or defaultValues change
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && defaultValues) {
                setAmount(defaultValues.amount?.toString() || '');
                // Handle both snake_case (from form values) and camelCase (from DealPayment type)
                setDate(defaultValues.payment_date || defaultValues.paymentDate || new Date().toISOString().split('T')[0]);
                setMethod(defaultValues.method || 'transfer');
                setType(defaultValues.payment_type || defaultValues.paymentType || 'final');
                setNote(defaultValues.note || '');
            } else {
                // Reset for create mode
                setAmount('');
                setDate(new Date().toISOString().split('T')[0]);
                setMethod('transfer');
                setType('final');
                setNote('');
            }
        }
    }, [isOpen, mode, defaultValues]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            amount: parseFloat(amount),
            payment_date: new Date(date).toISOString(),
            method,
            payment_type: type,
            note,
        });
    };

    const isEdit = mode === 'edit';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEdit ? 'แก้ไขการชำระเงิน' : 'บันทึกการชำระเงิน'}
                        </h3>
                        {dealTitle && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                สำหรับ: {dealTitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-lg font-mono"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            ประเภทการชำระ
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_type"
                                    value="final"
                                    checked={type === 'final'}
                                    onChange={() => setType('final')}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">ชำระปกติ (งวดงาน/ปิดยอด)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_type"
                                    value="deposit"
                                    checked={type === 'deposit'}
                                    onChange={() => setType('deposit')}
                                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">เงินมัดจำ</span>
                            </label>
                        </div>
                    </div>

                    {/* Date & Method */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                วันที่ชำระ
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                ช่องทาง
                            </label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="transfer">โอนเงิน</option>
                                <option value="cash">เงินสด</option>
                                <option value="cheque">เช็ค</option>
                                <option value="credit_card">บัตรเครดิต</option>
                                <option value="other">อื่นๆ</option>
                            </select>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            หมายเหตุ (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            placeholder="เช่น เลขที่สลิป, ชื่อผู้โอน..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                        >
                            {loading ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'ยืนยันการชำระเงิน')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
