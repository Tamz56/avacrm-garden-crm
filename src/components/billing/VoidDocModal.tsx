// src/components/billing/VoidDocModal.tsx
// Modal สำหรับ Void เอกสาร
import React, { useState } from 'react';
import { X, Ban, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import type { DocRow } from '../../hooks/useDealDocumentsFinancial';

type Props = {
    doc: DocRow;
    onClose: () => void;
    onSuccess: () => void;
};

export default function VoidDocModal({ doc, onClose, onSuccess }: Props) {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVoid = async () => {
        if (!reason.trim()) {
            setError('กรุณาระบุเหตุผลในการยกเลิก');
            return;
        }

        setLoading(true);
        setError(null);

        // Update document status to 'voided' with reason
        const { error: updateError } = await supabase
            .from('deal_documents')
            .update({
                status: 'voided',
                voided_at: new Date().toISOString(),
                voided_by: (await supabase.auth.getUser()).data.user?.id,
                void_reason: reason.trim()
            })
            .eq('id', doc.id);

        setLoading(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden dark:bg-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-red-50 dark:bg-red-900/20">
                    <div>
                        <h3 className="font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                            <Ban className="h-5 w-5" />
                            ยกเลิกเอกสาร
                        </h3>
                        <p className="text-xs text-red-600/70 mt-0.5">{doc.doc_no}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-bold mb-1">คำเตือน</p>
                            <p>การยกเลิกเอกสารไม่สามารถย้อนกลับได้ เอกสารจะถูกเก็บไว้เพื่อตรวจสอบแต่จะไม่สามารถใช้งานได้อีก</p>
                        </div>
                    </div>

                    {/* Document Info */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">ประเภท</span>
                            <span className="font-bold">{doc.doc_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">ยอดเงิน</span>
                            <span className="font-bold">฿{doc.grand_total?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">ลูกค้า</span>
                            <span className="font-bold">{doc.customer_name || '-'}</span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                            เหตุผลในการยกเลิก <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl focus:border-red-400 outline-none transition-all text-sm"
                            placeholder="เช่น ออกเอกสารผิด, ลูกค้ายกเลิกคำสั่งซื้อ, ข้อมูลไม่ถูกต้อง..."
                            required
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-11 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleVoid}
                            disabled={loading || !reason.trim()}
                            className="flex-1 h-11 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังยกเลิก...
                                </>
                            ) : (
                                <>
                                    <Ban className="h-4 w-4" />
                                    ยืนยันยกเลิก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
