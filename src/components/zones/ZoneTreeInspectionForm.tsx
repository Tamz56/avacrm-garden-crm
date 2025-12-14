import * as React from "react";
import { supabase } from "../../supabaseClient";
import { PlotInventoryRow } from "../../hooks/usePlotInventory";
import { ZoneTreeInspectionRow } from "../../hooks/useZoneTreeInspections";

type ZoneTreeInspectionFormProps = {
    zoneId?: string;
    onSaved?: () => void;
    inventoryRows?: PlotInventoryRow[];

    // โหมดแก้ไข
    editingRow?: ZoneTreeInspectionRow | null;
    onCancelEdit?: () => void;
};

export const ZoneTreeInspectionForm: React.FC<ZoneTreeInspectionFormProps> = ({
    zoneId,
    onSaved,
    inventoryRows = [],
    editingRow = null,
    onCancelEdit,
}) => {
    const [speciesId, setSpeciesId] = React.useState<string>("");
    const [sizeLabel, setSizeLabel] = React.useState<string>("");
    const [estimatedQty, setEstimatedQty] = React.useState<string>("");
    const [inspectionDate, setInspectionDate] = React.useState<string>("");
    const [grade, setGrade] = React.useState<string>("");
    const [notes, setNotes] = React.useState<string>("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // ---------- options dropdown ----------
    const options = React.useMemo(() => {
        const map = new Map<
            string,
            { speciesId: string; label: string; size: string }
        >();

        inventoryRows.forEach((r) => {
            const key = `${r.species_id}__${r.size_label || ""}`;
            if (!map.has(key)) {
                map.set(key, {
                    speciesId: r.species_id,
                    label: `${r.species_name_th || "ไม่ระบุ"} • ขนาด ${r.size_label || "-"
                        }`,
                    size: r.size_label || "",
                });
            }
        });

        return Array.from(map.values());
    }, [inventoryRows]);

    // ---------- ถ้าเปลี่ยน editingRow ให้เติมค่าในฟอร์ม ----------
    React.useEffect(() => {
        if (editingRow) {
            setSpeciesId(editingRow.species_id);
            setSizeLabel(editingRow.size_label || "");
            setEstimatedQty(
                editingRow.estimated_qty != null ? String(editingRow.estimated_qty) : ""
            );
            setInspectionDate(editingRow.inspection_date || "");
            setGrade(editingRow.grade || "");
            setNotes(editingRow.notes || "");
        } else {
            // เคลียร์ฟอร์ม (โหมดเพิ่มใหม่)
            setSpeciesId("");
            setSizeLabel("");
            setEstimatedQty("");
            setInspectionDate("");
            setGrade("");
            setNotes("");
        }
    }, [editingRow]);

    // ---------- submit ----------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneId) return;

        if (!speciesId || !sizeLabel || !estimatedQty || !inspectionDate) {
            setError("กรุณากรอกข้อมูลให้ครบ (พันธุ์, ขนาด, จำนวน, วันที่สำรวจ)");
            return;
        }

        setSaving(true);
        setError(null);

        let supaError = null;

        if (editingRow) {
            // ✏️ UPDATE แถวเดิมตาม id
            const { error } = await supabase
                .from("zone_tree_inspections")
                .update({
                    zone_id: zoneId,
                    species_id: speciesId,
                    size_label: sizeLabel,
                    estimated_qty: Number(estimatedQty),
                    inspection_date: inspectionDate,
                    grade: grade || null,
                    notes: notes || null,
                })
                .eq("id", editingRow.id);

            supaError = error;
        } else {
            // ➕ เพิ่มใหม่
            const { error } = await supabase.from("zone_tree_inspections").upsert(
                [
                    {
                        zone_id: zoneId,
                        species_id: speciesId,
                        size_label: sizeLabel,
                        estimated_qty: Number(estimatedQty),
                        inspection_date: inspectionDate,
                        grade: grade || null,
                        notes: notes || null,
                    },
                ],
                {
                    onConflict: "zone_id,species_id,size_label,grade",
                }
            );

            supaError = error;
        }

        setSaving(false);

        if (supaError) {
            console.error("save zone_tree_inspections error", supaError);
            setError(supaError.message);
            return;
        }

        if (onSaved) onSaved();
        if (editingRow && onCancelEdit) onCancelEdit();
    };

    const isEditMode = !!editingRow;

    return (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <h4 className="text-sm font-medium">
                {isEditMode
                    ? "แก้ไขผลสำรวจจำนวนต้นไม้ตามขนาด"
                    : "บันทึกผลสำรวจจำนวนต้นไม้ตามขนาด"}
            </h4>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                        ชนิด/พันธุ์ + ขนาด
                    </label>
                    <select
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={speciesId ? `${speciesId}__${sizeLabel}` : ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                                setSpeciesId("");
                                setSizeLabel("");
                                return;
                            }
                            const [spId, size] = val.split("__");
                            setSpeciesId(spId);
                            setSizeLabel(size);
                        }}
                    >
                        <option value="">
                            {isEditMode ? "เลือกชนิดต้นไม้..." : "เลือกจากรายการในแปลง..."}
                        </option>
                        {options.map((opt) => (
                            <option
                                key={`${opt.speciesId}__${opt.size}`}
                                value={`${opt.speciesId}__${opt.size}`}
                            >
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs text-gray-600 mb-1">
                        จำนวนที่ประเมินได้ (ต้น)
                    </label>
                    <input
                        type="number"
                        className="w-full border rounded px-2 py-1 text-sm text-right"
                        value={estimatedQty}
                        onChange={(e) => setEstimatedQty(e.target.value)}
                        min={0}
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-600 mb-1">
                        วันที่สำรวจ
                    </label>
                    <input
                        type="date"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">
                        เกรด (ถ้ามี)
                    </label>
                    <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="เช่น A / B / C"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs text-gray-600 mb-1">
                        หมายเหตุ (ถ้ามี)
                    </label>
                    <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-60"
                    disabled={saving || !zoneId}
                >
                    {saving
                        ? "กำลังบันทึก..."
                        : isEditMode
                            ? "บันทึกการแก้ไข"
                            : "บันทึกผลสำรวจ"}
                </button>

                {isEditMode && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-1.5 rounded border text-sm"
                    >
                        ยกเลิกแก้ไข
                    </button>
                )}
            </div>
        </form>
    );
};
