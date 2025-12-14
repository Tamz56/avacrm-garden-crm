import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { SpeciesFormDialog } from './SpeciesFormDialog';

type SpeciesRow = {
    id: string;
    name_th: string;
    name_en: string | null;
    code: string | null;
    notes: string | null;
    created_at: string;
};

type Props = {
    isDarkMode?: boolean;
};

export const SpeciesDatabasePage: React.FC<Props> = ({ isDarkMode = false }) => {
    const [species, setSpecies] = useState<SpeciesRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);

    const fetchSpecies = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('stock_species').select('*').order('name_th');
        if (error) { console.error('Error fetching species:', error); }
        else { setSpecies(data || []); }
        setLoading(false);
    };

    useEffect(() => { fetchSpecies(); }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`คุณต้องการลบพันธุ์ไม้ "${name}" ใช่หรือไม่?\n\nหากพันธุ์ไม้นี้ถูกใช้งานอยู่ จะไม่สามารถลบได้`)) return;
        const { error } = await supabase.from('stock_species').delete().eq('id', id);
        if (error) {
            console.error('Error deleting species:', error);
            alert(`ไม่สามารถลบได้: ${error.message}\n(อาจมีการใช้งานพันธุ์ไม้นี้ในสต็อกหรือดีล)`);
        } else { fetchSpecies(); }
    };

    const filteredSpecies = species.filter(s =>
        (s.name_th?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.name_en?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Theme-aware styles
    const textMain = isDarkMode ? "text-white" : "text-slate-800";
    const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500";
    const textMutedLight = isDarkMode ? "text-slate-500" : "text-slate-400";
    const inputClass = isDarkMode
        ? "border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:ring-emerald-500"
        : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-emerald-500";
    const tableBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const theadBg = isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-100";
    const theadText = isDarkMode ? "text-slate-400" : "text-slate-500";
    const tbodyDivide = isDarkMode ? "divide-slate-700" : "divide-slate-100";
    const rowHover = isDarkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50/50";
    const footerBg = isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100";

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className={`text-2xl font-bold ${textMain}`}>ฐานข้อมูลพันธุ์ไม้</h1>
                    <p className={`${textMuted} text-sm`}>จัดการรายชื่อพันธุ์ไม้ทั้งหมดในระบบ</p>
                </div>
                <button
                    onClick={() => setShowAddDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> เพิ่มพันธุ์ไม้
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textMutedLight}`} />
                <input
                    type="text" placeholder="ค้นหาชื่อพันธุ์ไม้, รหัส..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 shadow-sm ${inputClass}`}
                />
            </div>

            {/* Table */}
            <div className={`${tableBg} rounded-xl border shadow-sm overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`${theadBg} ${theadText} font-medium border-b`}>
                            <tr>
                                <th className="px-6 py-3 w-16">#</th>
                                <th className="px-6 py-3">ชื่อไทย</th>
                                <th className="px-6 py-3">ชื่ออังกฤษ</th>
                                <th className="px-6 py-3">รหัส</th>
                                <th className="px-6 py-3">หมายเหตุ</th>
                                <th className="px-6 py-3 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${tbodyDivide}`}>
                            {loading ? (
                                <tr><td colSpan={6} className={`px-6 py-8 text-center ${textMutedLight}`}>กำลังโหลดข้อมูล...</td></tr>
                            ) : filteredSpecies.length === 0 ? (
                                <tr><td colSpan={6} className={`px-6 py-8 text-center ${textMutedLight}`}>ไม่พบข้อมูลพันธุ์ไม้</td></tr>
                            ) : (
                                filteredSpecies.map((item, index) => (
                                    <tr key={item.id} className={`${rowHover} transition-colors`}>
                                        <td className={`px-6 py-3 ${textMutedLight}`}>{index + 1}</td>
                                        <td className={`px-6 py-3 font-medium ${textMain}`}>{item.name_th}</td>
                                        <td className={`px-6 py-3 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{item.name_en || '-'}</td>
                                        <td className={`px-6 py-3 ${textMuted} font-mono text-xs`}>{item.code || '-'}</td>
                                        <td className={`px-6 py-3 ${textMutedLight} max-w-xs truncate`}>{item.notes || '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(item.id, item.name_th)}
                                                className={`${textMutedLight} hover:text-rose-500 p-1`} title="ลบข้อมูล"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className={`px-6 py-3 border-t ${footerBg} text-xs ${textMutedLight}`}>
                    ทั้งหมด {filteredSpecies.length} รายการ
                </div>
            </div>

            <SpeciesFormDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={() => fetchSpecies()} />
        </div>
    );
};
