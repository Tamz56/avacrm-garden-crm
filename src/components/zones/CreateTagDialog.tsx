import React, { useState } from 'react';
import { PlotInventoryRow, usePlotInventory } from '../../hooks/usePlotInventory';

type CreateTagDialogProps = {
    open: boolean;
    inventoryItem: PlotInventoryRow | null;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
};

export const CreateTagDialog: React.FC<CreateTagDialogProps> = ({
    open,
    inventoryItem,
    onClose,
    onSuccess,
}) => {
    const { createTagsFromInventory, loading: apiLoading } = usePlotInventory();

    const [createQty, setCreateQty] = useState<number>(1);
    const [category, setCategory] = useState<string>('normal');
    const [error, setError] = useState<string | null>(null);

    if (!open || !inventoryItem) return null;

    const maxQty = inventoryItem.remaining_for_tag;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (createQty <= 0) {
            setError("จำนวนต้องมากกว่า 0");
            return;
        }
        if (createQty > maxQty) {
            setError(`จำนวนต้องไม่เกิน ${maxQty}`);
            return;
        }

        const result = await createTagsFromInventory(inventoryItem.id, createQty, category);
        if (result !== null) {
            alert(`สร้าง Tag สำเร็จ ${result} ต้น`);
            await onSuccess();
            onClose();
        } else {
            setError("เกิดข้อผิดพลาดในการสร้าง Tag");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">
                    สร้าง Tag จากแปลง
                </h3>

                <div className="mb-4 p-3 bg-slate-50 rounded text-sm text-slate-700">
                    <p><strong>พันธุ์:</strong> {inventoryItem.species_name_th}</p>
                    <p><strong>ขนาด:</strong> {inventoryItem.size_label}</p>
                    {inventoryItem.height_label && <p><strong>ความสูง:</strong> {inventoryItem.height_label}</p>}
                    <p><strong>คงเหลือให้สร้าง Tag:</strong> <span className="text-emerald-600 font-bold">{maxQty}</span> ต้น</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            จำนวนที่จะสร้าง Tag
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={createQty}
                            onChange={(e) => setCreateQty(parseInt(e.target.value) || 0)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">
                            ประเภท Tag
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        >
                            <option value="normal">ต้นทั่วไป (Normal)</option>
                            <option value="special">ต้นพิเศษ (Special)</option>
                            <option value="demo">ต้นตัวอย่าง (Demo)</option>
                            <option value="vip">VIP</option>
                        </select>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded border text-slate-600 hover:bg-slate-50"
                            disabled={apiLoading}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            disabled={apiLoading || maxQty <= 0}
                        >
                            {apiLoading ? 'กำลังสร้าง...' : 'ยืนยันสร้าง Tag'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
