// src/components/docs/MarkTamperedModal.tsx
// Modal for admins to mark a document as tampered

import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { TAMPER_REASONS, buildTamperedReason } from '../../constants/tamperReasons';

type Props = {
    docNo: string;
    loading?: boolean;
    onConfirm: (reason: string) => Promise<void>;
    onClose: () => void;
};

export function MarkTamperedModal({ docNo, loading, onConfirm, onClose }: Props) {
    const [selectedCode, setSelectedCode] = useState<string>('');
    const [note, setNote] = useState('');

    const isOther = selectedCode === 'OTHER';
    const canSubmit = selectedCode && (!isOther || note.trim().length > 0);

    const handleConfirm = async () => {
        if (!canSubmit) return;
        const reason = buildTamperedReason(selectedCode, note);
        await onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden dark:bg-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                                    Mark as Tampered
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

                    {/* Warning */}
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3 mb-5">
                        <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                            ⚠️ การ mark เอกสารเป็น tampered จะ<strong>ปิดกั้น</strong>การส่ง/export/finalize
                            <br />และจะ<strong>บันทึกประวัติ</strong>ในระบบ
                        </p>
                    </div>

                    {/* Reason Dropdown */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            เหตุผล (จำเป็น)
                        </label>
                        <select
                            value={selectedCode}
                            onChange={(e) => setSelectedCode(e.target.value)}
                            className="w-full h-11 px-4 border-2 border-slate-100 dark:border-slate-700 dark:bg-slate-900 rounded-xl text-sm focus:border-red-500 outline-none transition-all"
                        >
                            <option value="">-- เลือกเหตุผล --</option>
                            {TAMPER_REASONS.map((r) => (
                                <option key={r.code} value={r.code}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Note Textarea */}
                    <div className="mb-6">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            รายละเอียดเพิ่มเติม {isOther && <span className="text-red-500">(บังคับ)</span>}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="ระบุรายละเอียด..."
                            className={`w-full h-20 px-4 py-3 border-2 rounded-xl text-sm resize-none outline-none transition-all dark:bg-slate-900 ${isOther && !note.trim()
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-slate-100 dark:border-slate-700 focus:border-red-500'
                                }`}
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
                            disabled={!canSubmit || loading}
                            className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            ยืนยัน Mark Tampered
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
