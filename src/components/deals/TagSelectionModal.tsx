import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Check, Filter } from 'lucide-react';
import { supabase } from '../../supabaseClient';

type Tag = {
    id: string;
    tag_code: string;
    species_name_th: string;
    size_label: string;
    zone_name: string;
    status: string;
    primary_image_url?: string;
};

type TagSelectionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedTags: Tag[]) => Promise<void>;
    dealId: string;
};

export const TagSelectionModal: React.FC<TagSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    dealId
}) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTags();
            setSelectedTagIds(new Set());
            setSearch('');
        }
    }, [isOpen]);

    const fetchTags = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('view_tag_search')
                .select('id, tag_code, species_name_th, size_label, zone_name, status, primary_image_url')
                .eq('status', 'in_zone') // Only available tags
                .order('tag_code', { ascending: true })
                .limit(50);

            if (search) {
                query = query.ilike('tag_code', `%${search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTags(data || []);
        } catch (err) {
            console.error('Error fetching tags:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchTags();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const toggleTag = (tagId: string) => {
        const newSelected = new Set(selectedTagIds);
        if (newSelected.has(tagId)) {
            newSelected.delete(tagId);
        } else {
            newSelected.add(tagId);
        }
        setSelectedTagIds(newSelected);
    };

    const handleConfirm = async () => {
        if (selectedTagIds.size === 0) return;
        setSubmitting(true);
        try {
            const selectedTags = tags.filter(t => selectedTagIds.has(t.id));
            await onConfirm(selectedTags);
            onClose();
        } catch (err) {
            console.error('Error confirming tags:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span>🏷️</span> เลือกต้นไม้ (Scan Tags)
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            เลือก Tag ที่ต้องการผูกกับดีลนี้
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา Tag Code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-slate-900/50">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                    ) : tags.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                            <p>ไม่พบ Tag ที่ค้นหา</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {tags.map((tag) => {
                                const isSelected = selectedTagIds.has(tag.id);
                                return (
                                    <div
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className={`
                      relative p-3 rounded-xl border cursor-pointer transition-all duration-200 group
                      ${isSelected
                                                ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-500/10 dark:border-emerald-500'
                                                : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-500/50'}
                    `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <div className={`
                        w-5 h-5 rounded-md border flex items-center justify-center transition-colors mt-0.5
                        ${isSelected
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'bg-white border-gray-300 text-transparent group-hover:border-emerald-400 dark:bg-slate-700 dark:border-slate-600'}
                      `}>
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`font-mono font-bold text-sm ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-white'}`}>
                                                        {tag.tag_code}
                                                    </h3>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                                                        {tag.zone_name}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 truncate">
                                                    {tag.species_name_th}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                                                    ขนาด: {tag.size_label}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                        เลือกแล้ว <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedTagIds.size}</span> รายการ
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedTagIds.size === 0 || submitting}
                            className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            ยืนยัน ({selectedTagIds.size})
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
