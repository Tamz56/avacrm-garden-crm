import React, { useState } from 'react';
import { useZoneInspection } from '../hooks/useZoneInspection';
import { TRUNK_SIZE_OPTIONS } from '../config/treeSizes';
import { Calendar, Ruler, Trees, Info, Plus, X, Loader2, History } from 'lucide-react';

interface ZoneInspectionLogsProps {
    zoneId: string;
    zoneName: string;
}

export const ZoneInspectionLogs: React.FC<ZoneInspectionLogsProps> = ({ zoneId, zoneName }) => {
    const { logs, latestInspection, loading, addLog } = useZoneInspection(zoneId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
    const [treeCount, setTreeCount] = useState<string>('');
    const [trunkSizeOption, setTrunkSizeOption] = useState<string>('');
    const [customTrunkSize, setCustomTrunkSize] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    const [potSize, setPotSize] = useState<string>('');
    const [notes, setNotes] = useState('');

    const isCustomSize = trunkSizeOption === 'custom';

    const handleOpenModal = () => {
        setIsModalOpen(true);
        // Reset form
        setCheckDate(new Date().toISOString().split('T')[0]);
        setTreeCount('');
        setTrunkSizeOption('');
        setCustomTrunkSize('');
        setHeight('');
        setPotSize('');
        setNotes('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const numericTrunkSize = trunkSizeOption === 'custom'
            ? Number(customTrunkSize || 0)
            : Number(trunkSizeOption.replace('"', ''));

        const success = await addLog({
            check_date: checkDate,
            tree_count: treeCount ? Number(treeCount) : null,
            trunk_size_inch: numericTrunkSize || null,
            height_m: height ? Number(height) : null,
            pot_size_inch: potSize ? Number(potSize) : null,
            maintenance_notes: notes || null,
            zone_id: zoneId // Added to satisfy type, though hook handles it
        } as any);

        setSubmitting(false);
        if (success) {
            setIsModalOpen(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    ประวัติการตรวจและบำรุงรักษา
                </h3>
                <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                    <Plus className="w-3.5 h-3.5" />
                    บันทึกการตรวจ
                </button>
            </div>

            {/* Latest Summary Card */}
            {latestInspection && latestInspection.check_date && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-wrap gap-4 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium">ล่าสุด:</span>
                        {new Date(latestInspection.check_date).toLocaleDateString('th-TH')}
                    </div>
                    {latestInspection.trunk_size_inch && (
                        <div className="flex items-center gap-1.5">
                            <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-medium">ขนาด:</span>
                            {latestInspection.trunk_size_inch}"
                        </div>
                    )}
                    {latestInspection.height_m && (
                        <div>
                            <span className="font-medium">สูง:</span> {latestInspection.height_m} ม.
                        </div>
                    )}
                    {latestInspection.maintenance_notes && (
                        <div className="w-full pt-1 border-t border-emerald-100 mt-1 text-slate-600 italic">
                            "{latestInspection.maintenance_notes}"
                        </div>
                    )}
                </div>
            )}

            {/* Logs Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">วันที่</th>
                            <th className="px-3 py-2 text-right font-medium">ขนาด (นิ้ว)</th>
                            <th className="px-3 py-2 text-right font-medium">สูง (ม.)</th>
                            <th className="px-3 py-2 text-right font-medium">กระถาง (นิ้ว)</th>
                            <th className="px-3 py-2 text-right font-medium">จำนวนต้น</th>
                            <th className="px-3 py-2 text-left font-medium">บันทึก / การบำรุง</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && logs.length === 0 ? (
                            <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">ยังไม่มีประวัติการตรวจ</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-700">
                                        {new Date(log.check_date).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                        {log.trunk_size_inch || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                        {log.height_m || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                        {log.pot_size_inch || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-700">
                                        {log.tree_count?.toLocaleString() || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">
                                        {log.maintenance_notes || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-800">บันทึกการตรวจแปลง / บำรุงรักษา</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                            {latestInspection && (
                                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="font-semibold text-slate-700">ค่าก่อนหน้า: </span>
                                    {latestInspection.trunk_size_inch ? `${latestInspection.trunk_size_inch}"` : '-'} /
                                    {latestInspection.height_m ? ` ${latestInspection.height_m} ม.` : ' -'} /
                                    กระถาง {latestInspection.pot_size_inch ? `${latestInspection.pot_size_inch}"` : '-'}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">วันที่ตรวจ</label>
                                    <input
                                        type="date"
                                        required
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนต้นที่ตรวจ/นับได้</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={treeCount}
                                        onChange={(e) => setTreeCount(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="ระบุจำนวน"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">ขนาดลำต้น (นิ้ว)</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={trunkSizeOption}
                                        onChange={(e) => {
                                            setTrunkSizeOption(e.target.value);
                                            if (e.target.value !== 'custom') setCustomTrunkSize('');
                                        }}
                                    >
                                        <option value="">-- เลือกขนาด --</option>
                                        {TRUNK_SIZE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    {isCustomSize && (
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            placeholder="ระบุเอง"
                                            value={customTrunkSize}
                                            onChange={(e) => setCustomTrunkSize(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">ความสูงเฉลี่ย (เมตร)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="เช่น 2.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">ขนาดกระถาง (นิ้ว)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={potSize}
                                        onChange={(e) => setPotSize(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="เช่น 12"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">บันทึกการบำรุง / กิจกรรม</label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="เช่น ตัดหญ้า, ใส่ปุ๋ยสูตร 15-15-15, เปลี่ยนกระถาง..."
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
