// src/components/docs/UnmarkTamperedModal.tsx
// Confirmation modal for admins to unmark/clear tampered status

import React, { useState } from 'react';
import { CheckCircle, X, Loader2 } from 'lucide-react';

type Props = {
    docNo: string;
    loading?: boolean;
    onConfirm: (reason: string) => Promise<void>;
    onClose: () => void;
};

export function UnmarkTamperedModal({ docNo, loading, onConfirm, onClose }: Props) {
    const [note, setNote] = useState('');

    const handleConfirm = async () => {
        // Standard reason format for audit trail
        const reason = note.trim()
            ? `CLEARED_BY_ADMIN | ${note.trim()}`
            : 'CLEARED_BY_ADMIN';
        await onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden dark:bg-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                    Unmark Tampered
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{docNo}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl p-3 mb-5">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                            ✓ การ unmark จะ<strong>เปิดใช้งาน</strong>การส่ง/export/finalize อีกครั้ง
                            <br />และจะ<strong>บันทึกประวัติ</strong>ว่า admin ได้ตรวจสอบแล้ว
                        </p>
                    </div>

                    {/* Optional Note */}
                    <div className="mb-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            หมายเหตุ (ไม่บังคับ)
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="เช่น verified ok, ตรวจสอบแล้วไม่พบปัญหา"
                            className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 rounded-xl text-sm focus:border-green-500 outline-none transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            ยืนยัน Unmark
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
