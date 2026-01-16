// src/components/stock/StockGroupsPage.tsx
import React, { useState } from "react";
import { Package, Plus, Search, Edit2, Trash2, Loader2 } from "lucide-react";
import { useStockGroups, StockGroup } from "../../hooks/useStockGroups";
import { useStockGroupsCRUD } from "../../hooks/useStockGroupsCRUD";
import StockGroupFormDialog, { StockGroupFormData } from "./StockGroupFormDialog";

const StockGroupsPage: React.FC = () => {
    const [filterSpecies, setFilterSpecies] = useState("");
    const [filterSize, setFilterSize] = useState("");
    const [filterZone, setFilterZone] = useState("");

    const { data, loading, error, refetch } = useStockGroups({
        filterSpecies: filterSpecies || undefined,
        filterSize: filterSize || undefined,
        filterZone: filterZone || undefined,
    });

    const { create, update, remove, saving, deleting } = useStockGroupsCRUD();

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<StockGroup | null>(null);

    const handleOpenAdd = () => {
        setEditingGroup(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (group: StockGroup) => {
        setEditingGroup(group);
        setDialogOpen(true);
    };

    const handleSave = async (formData: StockGroupFormData): Promise<boolean> => {
        let success = false;

        if (editingGroup) {
            // Update
            const result = await update(editingGroup.id, formData);
            success = !!result;
        } else {
            // Create
            const result = await create(formData);
            success = !!result;
        }

        if (success) {
            await refetch();
        }
        return success;
    };

    const handleDelete = async (id: string) => {
        const confirmed = window.confirm("ยืนยันการลบกลุ่มสต๊อกนี้?");
        if (!confirmed) return;

        const success = await remove(id);
        if (success) {
            await refetch();
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">กลุ่มสต๊อก (Stock Groups)</h1>
                        <p className="text-xs text-slate-500">จัดการกลุ่มสต๊อกสินค้า</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    เพิ่มกลุ่มสต๊อก
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                            <Search className="inline h-3 w-3 mr-1" />
                            ค้นหาพันธุ์
                        </label>
                        <input
                            type="text"
                            value={filterSpecies}
                            onChange={(e) => setFilterSpecies(e.target.value)}
                            placeholder="ชื่อพันธุ์..."
                            className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5"
                        />
                    </div>
                    <div className="min-w-[120px]">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">ขนาด</label>
                        <input
                            type="text"
                            value={filterSize}
                            onChange={(e) => setFilterSize(e.target.value)}
                            placeholder="L, XL..."
                            className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5"
                        />
                    </div>
                    <div className="min-w-[120px]">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">โซน</label>
                        <input
                            type="text"
                            value={filterZone}
                            onChange={(e) => setFilterZone(e.target.value)}
                            placeholder="A1, B2..."
                            className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFilterSpecies("");
                            setFilterSize("");
                            setFilterZone("");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
                    >
                        ล้างตัวกรอง
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        กำลังโหลด...
                    </div>
                ) : error ? (
                    <div className="p-4 text-sm text-red-600">เกิดข้อผิดพลาด: {error.message}</div>
                ) : data.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                        ไม่พบข้อมูลกลุ่มสต๊อก
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600">พันธุ์</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600">ขนาด</th>
                                    <th className="px-4 py-3 text-left font-medium text-slate-600">โซน</th>
                                    <th className="px-4 py-3 text-center font-medium text-slate-600">จำนวนทั้งหมด</th>
                                    <th className="px-4 py-3 text-center font-medium text-slate-600">จองแล้ว</th>
                                    <th className="px-4 py-3 text-center font-medium text-slate-600">ว่าง</th>
                                    <th className="px-4 py-3 text-center font-medium text-slate-600"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((g) => (
                                    <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">{g.species_name_th || "-"}</div>
                                            {g.species_name_en && (
                                                <div className="text-xs text-slate-400">{g.species_name_en}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{g.size_label || "-"}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {g.zone_key || "-"}
                                            {g.plot_key && <span className="text-slate-400">/{g.plot_key}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium">{g.qty_total}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-amber-600">{g.qty_reserved}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={g.qty_available > 0 ? "text-emerald-600 font-medium" : "text-slate-400"}>
                                                {g.qty_available}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(g)}
                                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(g.id)}
                                                    disabled={deleting === g.id}
                                                    className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 disabled:opacity-50"
                                                    title="ลบ"
                                                >
                                                    {deleting === g.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Dialog */}
            <StockGroupFormDialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
                editingGroup={editingGroup}
                saving={saving}
            />
        </div>
    );
};

export default StockGroupsPage;
