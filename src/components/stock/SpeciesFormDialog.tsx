import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { X } from 'lucide-react';

type SpeciesFormDialogProps = {
    open: boolean;
    onClose: () => void;
    onSuccess: (newSpeciesId: string) => void;
};

export const SpeciesFormDialog: React.FC<SpeciesFormDialogProps> = ({
    open,
    onClose,
    onSuccess,
}) => {
    const [nameTh, setNameTh] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [code, setCode] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameTh.trim()) {
            setError('กรุณาระบุชื่อภาษาไทย');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('stock_species')
                .insert({
                    name: nameTh.trim(),
                    name_th: nameTh.trim(),
                    name_en: nameEn.trim() || null,
                    code: code.trim() || null,
                    notes: notes.trim() || null,
                })
                .select()
                .single();

            if (error) throw error;

            onSuccess(data.id);
            onClose();
            // Reset form
            setNameTh('');
            setNameEn('');
            setCode('');
            setNotes('');
        } catch (err: any) {
            console.error('Error creating species:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">เพิ่มพันธุ์ไม้ใหม่</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            ชื่อภาษาไทย <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={nameTh}
                            onChange={(e) => setNameTh(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="เช่น สักทอง, ยางนา"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            ชื่อภาษาอังกฤษ
                        </label>
                        <input
                            type="text"
                            value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="เช่น Teak, Yang Na"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            รหัสพันธุ์ (Code)
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="เช่น TK01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            หมายเหตุ
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="รายละเอียดเพิ่มเติม..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            disabled={loading}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
