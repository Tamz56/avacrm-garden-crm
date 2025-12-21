// src/components/zones/CreateTagModal.tsx
import React from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";

export type PlotOption = { id: string; note: string | null };

export type CreateTagModalProps = {
    zoneId: string;
    speciesOptions: any[];
    plots: PlotOption[];
    plotsLoading: boolean;
    onClose: () => void;
    onSaved: () => void;
    // Default values for quick create
    defaultPlotId?: string;
    defaultSpeciesId?: string;
    defaultSizeLabel?: string;
    lockPlot?: boolean; // Disable plot change when preselected
};

export const CreateTagModal: React.FC<CreateTagModalProps> = ({
    zoneId,
    speciesOptions,
    plots,
    plotsLoading,
    onClose,
    onSaved,
    defaultPlotId = "",
    defaultSpeciesId = "",
    defaultSizeLabel = "",
    lockPlot = false,
}) => {
    const [isBatch, setIsBatch] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    // Form state with defaults
    const [form, setForm] = React.useState({
        speciesId: defaultSpeciesId,
        sizeLabel: defaultSizeLabel,
        qty: 1,
        tagsCount: 10,
        row: "",
        position: "",
        notes: "",
        plotId: defaultPlotId || (plots.length === 1 ? plots[0]?.id || "" : ""),
    });

    // Update plotId when plots load and defaultPlotId is empty
    React.useEffect(() => {
        if (!form.plotId && plots.length === 1) {
            setForm((prev) => ({ ...prev, plotId: plots[0].id }));
        }
    }, [plots, form.plotId]);

    // Inventory guard states
    const [inv, setInv] = React.useState<{ planted_qty: number; created_tag_qty: number } | null>(null);
    const [taggedQty, setTaggedQty] = React.useState<number>(0);
    const [loadingInv, setLoadingInv] = React.useState(false);
    const [invMsg, setInvMsg] = React.useState<string | null>(null);

    // Fetch inventory when species/size changes
    React.useEffect(() => {
        if (!zoneId || !form.speciesId || !form.sizeLabel) {
            setInv(null);
            setTaggedQty(0);
            setInvMsg(null);
            return;
        }

        let cancelled = false;
        (async () => {
            setLoadingInv(true);
            setInvMsg(null);

            const { data: invRow, error: invErr } = await supabase
                .from("planting_plot_inventory")
                .select("planted_qty, created_tag_qty")
                .eq("plot_id", zoneId)
                .eq("species_id", form.speciesId)
                .eq("size_label", form.sizeLabel)
                .maybeSingle();

            if (cancelled) return;

            if (invErr || !invRow) {
                setInv(null);
                setTaggedQty(0);
                setInvMsg("ยังไม่มี Inventory สำหรับขนาดนี้ — กรุณาเพิ่ม Inventory ก่อนสร้าง Tag");
                setLoadingInv(false);
                return;
            }

            const { data: tq, error: tqErr } = await supabase.rpc("get_tagged_qty", {
                p_zone_id: zoneId,
                p_species_id: form.speciesId,
                p_size_label: form.sizeLabel,
            });

            if (cancelled) return;

            setInv(invRow);
            setTaggedQty((tqErr ? 0 : (tq ?? 0)) as number);
            setLoadingInv(false);
        })();

        return () => { cancelled = true; };
    }, [zoneId, form.speciesId, form.sizeLabel]);

    // UUID validation helper
    const isUuid = (s?: string) =>
        !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

    // Calculate remaining and validation
    const qtyPerTag = Number(form.qty || 1);
    const tagsCount = Number(form.tagsCount || 10);
    const requestedTrees = isBatch ? (qtyPerTag * tagsCount) : qtyPerTag;
    const remainingQty = inv ? Math.max(inv.planted_qty - taggedQty, 0) : 0;
    const canSave = !!inv && requestedTrees > 0 && requestedTrees <= remainingQty && !loadingInv && !!form.speciesId && !!form.sizeLabel && isUuid(form.plotId) && plots.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev: any) => ({
            ...prev,
            [name]: (name === "qty" || name === "tagsCount") ? Number(value || 1) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.speciesId) {
            alert("กรุณาเลือกชนิด/พันธุ์ไม้");
            return;
        }
        if (!form.sizeLabel) {
            alert("กรุณาระบุขนาด");
            return;
        }
        if (!inv) {
            alert("ไม่พบ Inventory ของขนาดนี้ กรุณาเพิ่ม Inventory ก่อน");
            return;
        }
        if (requestedTrees > remainingQty) {
            alert(`จำนวนที่ต้องการสร้างเกินคงเหลือ (คงเหลือ ${remainingQty} ต้น)`);
            return;
        }
        setSaving(true);

        // Validate plotId
        if (!form.plotId) {
            alert("กรุณาเลือกแปลง (Plot) ก่อนบันทึก Tag");
            setSaving(false);
            return;
        }

        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.plotId);
        if (!isValidUuid) {
            alert("plotId ไม่ถูกต้อง (UUID): " + form.plotId);
            setSaving(false);
            return;
        }

        let error;

        if (isBatch) {
            console.log("create_tree_tags_batch_v2 payload", {
                p_plot_id: form.plotId,
                p_species_id: form.speciesId,
                p_size_label: form.sizeLabel || null,
                p_qty: form.qty || 1,
                p_planting_row: form.row ? Number(form.row) : null,
                p_planting_position: form.position ? Number(form.position) : null,
                p_notes: form.notes || null,
                p_tags_count: form.tagsCount || 10,
            });

            const { error: batchError } = await supabase.rpc("create_tree_tags_batch_v2", {
                p_plot_id: form.plotId,
                p_species_id: form.speciesId,
                p_size_label: form.sizeLabel || null,
                p_qty: form.qty || 1,
                p_planting_row: form.row ? Number(form.row) : null,
                p_planting_position: form.position ? Number(form.position) : null,
                p_notes: form.notes || null,
                p_tags_count: form.tagsCount || 10,
            });
            error = batchError;
        } else {
            console.log("create_tree_tag_v2 payload", {
                p_plot_id: form.plotId,
                p_species_id: form.speciesId,
                p_size_label: form.sizeLabel || null,
                p_qty: form.qty || 1,
                p_planting_row: form.row ? Number(form.row) : null,
                p_planting_position: form.position ? Number(form.position) : null,
                p_status: "in_zone",
                p_notes: form.notes || null,
            });

            const { error: singleError } = await supabase.rpc("create_tree_tag_v2", {
                p_plot_id: form.plotId,
                p_species_id: form.speciesId,
                p_size_label: form.sizeLabel || null,
                p_qty: form.qty || 1,
                p_planting_row: form.row ? Number(form.row) : null,
                p_planting_position: form.position ? Number(form.position) : null,
                p_status: "in_zone",
                p_notes: form.notes || null,
            });
            error = singleError;
        }

        setSaving(false);

        if (error) {
            console.error("create tag error", error);
            const msg = error.message || "";

            // Duplicate position error
            if (msg.includes("duplicate key") && msg.includes("uq_tree_tags_position")) {
                alert(`ตำแหน่งนี้ถูกใช้แล้ว (แถว ${form.row || "-"} / ต้นที่ ${form.position || "-"}) กรุณาเปลี่ยนตำแหน่ง`);
                return;
            }

            if (msg.includes("ไม่พบข้อมูล Inventory") || msg.includes("ไม่พบ Inventory")) {
                alert("ไม่พบ Inventory ของขนาดนี้ กรุณาเพิ่ม Inventory ก่อน");
            } else if (msg.includes("เกินจำนวน") || msg.includes("เกิน")) {
                alert(`จำนวนที่ต้องการสร้างเกินคงเหลือ (คงเหลือ ${remainingQty} ต้น)`);
            } else {
                alert("ไม่สามารถสร้าง Tag ได้: " + msg);
            }
            return;
        }

        // Success
        onSaved();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                        {isBatch ? "สร้าง Tag แบบกลุ่ม (Batch)" : "สร้าง Tag ใหม่ในแปลงนี้"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
                    <button
                        type="button"
                        onClick={() => setIsBatch(false)}
                        className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${!isBatch ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        สร้างทีละใบ
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsBatch(true)}
                        className={`flex-1 rounded-md py-1 text-xs font-medium transition-all ${isBatch ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        ⚡ สร้างเป็นล็อต (Batch)
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="mb-1 block text-slate-600">ชนิด / พันธุ์ไม้</label>
                        <select
                            name="speciesId"
                            value={form.speciesId}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        >
                            <option value="">-- เลือกพันธุ์ไม้ --</option>
                            {speciesOptions.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                    {sp.name_th}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Plot Selector */}
                    <div>
                        <label className="mb-1 block text-slate-600">เลือกแปลง (Plot)</label>
                        <select
                            name="plotId"
                            value={form.plotId ?? ""}
                            onChange={handleChange}
                            disabled={plotsLoading || plots.length === 0 || lockPlot}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs disabled:bg-slate-50"
                        >
                            <option value="" disabled>
                                {plotsLoading ? "กำลังโหลด..." : plots.length === 0 ? "ไม่มีแปลง" : "-- เลือกแปลง --"}
                            </option>
                            {plots.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {(p.note ?? "Plot")} — {String(p.id).slice(0, 8)}
                                </option>
                            ))}
                        </select>
                        {!plotsLoading && plots.length === 0 && (
                            <p className="mt-1 text-[10px] text-amber-600">
                                ⚠️ โซนนี้ยังไม่มีแปลงย่อย (Plot) กรุณาสร้างแปลงก่อนจึงจะสร้าง Tag ได้
                            </p>
                        )}
                        {lockPlot && (
                            <p className="mt-1 text-[10px] text-sky-600">
                                🔒 ล็อกแปลงจากหน้า Quick Create
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-slate-600">ขนาด</label>
                            <input
                                name="sizeLabel"
                                value={form.sizeLabel}
                                onChange={handleChange}
                                placeholder={`เช่น 3 นิ้ว`}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-slate-600">จำนวนต้นต่อ Tag</label>
                            <input
                                type="number"
                                name="qty"
                                min={1}
                                value={form.qty}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            />
                        </div>
                    </div>

                    {/* Inventory Summary Card */}
                    {form.speciesId && form.sizeLabel && (
                        <div className={`rounded-lg border p-3 ${inv ? "border-sky-200 bg-sky-50" : "border-amber-200 bg-amber-50"}`}>
                            {loadingInv ? (
                                <p className="text-xs text-slate-500">กำลังตรวจสอบ Inventory...</p>
                            ) : invMsg ? (
                                <p className="text-xs text-amber-700">⚠️ {invMsg}</p>
                            ) : inv ? (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-600">ปลูกในระบบ:</span>
                                        <span className="font-medium text-slate-800">{inv.planted_qty.toLocaleString()} ต้น</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-600">ติด Tag แล้ว:</span>
                                        <span className="font-medium text-sky-700">{taggedQty.toLocaleString()} ต้น</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-sky-200 pt-1">
                                        <span className="font-medium text-slate-700">คงเหลือสร้าง Tag ได้:</span>
                                        <span className={`font-bold ${remainingQty > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {remainingQty.toLocaleString()} ต้น
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {isBatch && (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                            <label className="mb-1 block font-medium text-emerald-800">
                                จำนวน Tag ที่ต้องการสร้าง (ใบ)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    name="tagsCount"
                                    min={1}
                                    max={remainingQty > 0 ? remainingQty : 500}
                                    value={form.tagsCount || 10}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-xs focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                <div className="flex gap-1">
                                    {[10, 20, 50, 100].filter(n => n <= remainingQty || remainingQty === 0).map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setForm((prev: any) => ({ ...prev, tagsCount: num }))}
                                            className="rounded border border-emerald-200 bg-white px-2 text-[10px] text-emerald-700 hover:bg-emerald-50"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="mt-1 text-[10px] text-emerald-600">
                                ระบบจะสร้าง Tag ใหม่ {form.tagsCount || 10} ใบ ({requestedTrees} ต้น) โดยรันเลขต่อเนื่องกัน
                                {requestedTrees > remainingQty && remainingQty > 0 && (
                                    <span className="text-red-600 font-medium"> (เกินคงเหลือ!)</span>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-slate-600">แถวที่ (Row)</label>
                            <input
                                name="row"
                                value={form.row}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-slate-600">ลำดับในแถว (Position)</label>
                            <input
                                name="position"
                                value={form.position}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-slate-600">หมายเหตุ</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={2}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        />
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !canSave}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {saving ? "กำลังบันทึก..." : (isBatch ? `สร้าง ${form.tagsCount || 10} Tags` : "บันทึก Tag")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTagModal;
