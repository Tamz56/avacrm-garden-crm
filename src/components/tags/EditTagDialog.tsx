import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { TagSearchRow } from "../../hooks/useTagSearch";
import { trunkSizeOptions } from "../../constants/treeOptions";

type EditTagDialogProps = {
    open: boolean;
    tag?: TagSearchRow | null;
    tagId?: string | null;
    onClose: () => void;
    onSaved?: () => void; // ให้ TagList reload หลังเซฟได้
};

export const EditTagDialog: React.FC<EditTagDialogProps> = ({
    open,
    tag: initialTag,
    tagId,
    onClose,
    onSaved,
}) => {
    const [tag, setTag] = useState<TagSearchRow | null>(initialTag || null);
    const [loadingTag, setLoadingTag] = useState(false);

    const [sizeLabel, setSizeLabel] = useState("");
    const [grade, setGrade] = useState<string | "">("")
    const [status, setStatus] = useState<string>("");  // New: Tag status
    const [note, setNote] = useState("");

    // Special Tree Fields
    const [treeCategory, setTreeCategory] = useState("normal");
    const [displayName, setDisplayName] = useState("");
    const [featureNotes, setFeatureNotes] = useState("");
    const [primaryImageUrl, setPrimaryImageUrl] = useState("");

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch tag if tagId is provided
    useEffect(() => {
        if (open && tagId && !initialTag) {
            setLoadingTag(true);
            supabase
                .from('view_tag_search')
                .select('*')
                .eq('id', tagId)
                .single()
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Error fetching tag:", error);
                        setError(error.message);
                    } else {
                        setTag(data as TagSearchRow);
                    }
                    setLoadingTag(false);
                });
        } else if (initialTag) {
            setTag(initialTag);
        }
    }, [open, tagId, initialTag]);

    useEffect(() => {
        if (tag) {
            setSizeLabel(tag.size_label ?? "");
            setGrade(tag.grade ?? "");
            setStatus(tag.status ?? "in_zone");  // New: Load current status
            setNote(tag.note ?? "");
            // Wait, previous code used tag.note. Let's stick to what was there or check.
            // In previous turns, I saw `note` in `view_special_trees` but `notes` in `tree_tags`.
            // `TagSearchRow` usually matches the view.
            // Let's assume `note` or `notes`. The previous code used `tag.note`.
            // However, the update uses `notes: note`.
            // Let's try `tag.note ?? tag.notes ?? ""` to be safe if we are unsure, but `TagSearchRow` likely has one.
            // Looking at `useTagSearch.ts` from previous context... it had `note: string | null`.
            // So `tag.note` is likely correct for the read.
            setNote(tag.note ?? "");

            setTreeCategory(tag.tree_category ?? "normal");
            setDisplayName(tag.display_name ?? "");
            setFeatureNotes(tag.feature_notes ?? "");
            setPrimaryImageUrl(tag.primary_image_url ?? "");
        }
    }, [tag]);

    if (!open) return null;
    if (!tag && !loadingTag) return null;

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!tag) return;
        setSaving(true);
        setError(null);

        const { error } = await supabase
            .from("tree_tags")
            .update({
                size_label: sizeLabel || null,
                grade: grade || null,
                status: status || null,  // New: Update status
                notes: note || null,
                tree_category: treeCategory === "normal" ? null : treeCategory,
                display_name: displayName || null,
                feature_notes: featureNotes || null,
                primary_image_url: primaryImageUrl || null,
            })
            .eq("id", tag.id);

        if (error) {
            console.error("update tag error", error);
            setError(error.message);
        } else {
            if (onSaved) onSaved();
            onClose();
        }

        setSaving(false);
    }

    async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            const file = e.target.files?.[0];
            if (!file || !tag) return;
            setUploading(true);

            const fileExt = file.name.split('.').pop();
            const filePath = `tags/${tag.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('tree-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('tree-images')
                .getPublicUrl(filePath);

            setPrimaryImageUrl(data.publicUrl);
        } catch (err: any) {
            console.error('upload error', err);
            alert('อัปโหลดรูปไม่สำเร็จ: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4">
                    {loadingTag ? "กำลังโหลด..." : `แก้ไข Tag ${tag?.tag_code || ''}`}
                </h2>

                {loadingTag ? (
                    <div className="text-center py-8 text-slate-500">กำลังโหลดข้อมูล...</div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    ขนาด (นิ้ว)
                                </label>
                                <select
                                    value={sizeLabel}
                                    onChange={(e) => setSizeLabel(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                >
                                    <option value="">เลือกขนาด...</option>
                                    {trunkSizeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    เกรด
                                </label>
                                <input
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder="เช่น A / B / C"
                                />
                            </div>
                        </div>

                        {/* New: Status Dropdown */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                สถานะ (Lifecycle)
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm"
                            >
                                <optgroup label="อยู่ในแปลง">
                                    <option value="in_zone">🌱 อยู่ในแปลง (in_zone)</option>
                                    <option value="selected_for_dig">📋 เลือกไว้จะขุด (selected_for_dig)</option>
                                </optgroup>
                                <optgroup label="กำลังตัดราก">
                                    <option value="root_prune_1">✂️ ตัดราก 1 (root_prune_1)</option>
                                    <option value="root_prune_2">✂️ ตัดราก 2 (root_prune_2)</option>
                                    <option value="root_prune_3">✂️ ตัดราก 3 (root_prune_3)</option>
                                    <option value="root_prune_4">✂️ ตัดราก 4 (root_prune_4)</option>
                                </optgroup>
                                <optgroup label="พร้อมยก">
                                    <option value="ready_to_lift">✅ พร้อมยก/พร้อมขาย (ready_to_lift)</option>
                                </optgroup>
                                <optgroup label="ขาย/จัดส่ง">
                                    <option value="reserved">🔒 จองแล้ว (reserved)</option>
                                    <option value="dig_ordered">📦 ในใบสั่งขุด (dig_ordered)</option>
                                    <option value="dug">⛏️ ขุดแล้ว (dug)</option>
                                    <option value="shipped">🚚 จัดส่งแล้ว (shipped)</option>
                                    <option value="planted">🌳 ปลูกแล้ว (planted)</option>
                                </optgroup>
                                <optgroup label="อื่นๆ">
                                    <option value="rehab">🏥 พักฟื้น (rehab)</option>
                                    <option value="dead">💀 ตาย (dead)</option>
                                    <option value="cancelled">❌ ยกเลิก (cancelled)</option>
                                </optgroup>
                            </select>
                            <p className="mt-1 text-[11px] text-slate-500">
                                เปลี่ยนสถานะเพื่อบันทึก lifecycle ของต้นไม้
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                หมายเหตุ (ภายใน)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full border rounded px-3 py-2 text-sm"
                                rows={2}
                            />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">ข้อมูลต้นพิเศษ</h3>

                            <div className="space-y-4">
                                <div className="space-y-2 mt-6">
                                    <label className="block text-sm font-medium text-slate-700">
                                        ประเภท
                                    </label>
                                    <select
                                        value={treeCategory}
                                        onChange={(e) => setTreeCategory(e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="normal">ต้นทั่วไป</option>
                                        <option value="special">ต้นพิเศษ (โชว์ลูกค้า)</option>
                                        <option value="demo">Demo / ทดลอง</option>
                                        <option value="vip">VIP / สำคัญเป็นพิเศษ</option>
                                    </select>
                                </div>

                                {treeCategory !== "normal" && (
                                    <>
                                        <div className="space-y-2 mt-4">
                                            <label className="block text-sm font-medium text-slate-700">
                                                ชื่อโชว์บนหน้า “ต้นพิเศษ”
                                            </label>
                                            <input
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm"
                                                placeholder="เช่น Silver Oak AVAONE ต้นเด่นแปลงหน้าฟาร์ม"
                                            />
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <label className="block text-sm font-medium text-slate-700">
                                                จุดเด่น / ข้อมูลเพิ่มเติม
                                            </label>
                                            <textarea
                                                value={featureNotes}
                                                onChange={(e) => setFeatureNotes(e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm"
                                                rows={3}
                                                placeholder="เช่น ทรงพุ่มสวย ใบแน่น เหมาะทำต้นโชว์หน้าทางเข้า..."
                                            />
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <label className="block text-sm font-medium text-slate-700">
                                                รูปหลัก (URL)
                                            </label>
                                            <input
                                                value={primaryImageUrl}
                                                onChange={(e) => setPrimaryImageUrl(e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 text-sm"
                                                placeholder="วางลิงก์รูปจาก Supabase Storage"
                                            />
                                            <div className="flex items-center gap-3 mt-2">
                                                <label className="inline-flex items-center px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-slate-50">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleUploadImage}
                                                        disabled={uploading}
                                                    />
                                                    {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปจากเครื่อง'}
                                                </label>
                                                {primaryImageUrl && (
                                                    <a
                                                        href={primaryImageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-sky-600 underline"
                                                    >
                                                        ดูรูป
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-500">{error}</div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 py-1.5 rounded border text-sm"
                                disabled={saving || uploading}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={saving || uploading}
                                className="px-4 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
