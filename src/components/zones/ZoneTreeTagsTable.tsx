import React from "react";
import { supabase } from "../../supabaseClient";
import { QrCode, Printer, Copy, Loader2, Plus, X, Trash2 } from "lucide-react";
import { useZoneTreeTags } from "../../hooks/useZoneTreeTags";
import { PrintTagsModal } from "./PrintTagsModal";
import QRCode from "qrcode";

type ZoneTreeTagsTableProps = {
    zoneId: string;
    onTagsChanged?: () => void | Promise<void>;
};

const statusBadgeMap: Record<string, string> = {
    in_zone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200", // legacy alias
    selected_for_dig: "bg-sky-50 text-sky-700 border-sky-200",
    root_prune_1: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_2: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_3: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_4: "bg-yellow-50 text-yellow-700 border-yellow-200",
    ready_to_lift: "bg-lime-50 text-lime-700 border-lime-200",
    reserved: "bg-amber-50 text-amber-700 border-amber-200",
    dig_ordered: "bg-orange-50 text-orange-700 border-orange-200",
    dug: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    planted: "bg-green-50 text-green-700 border-green-200",
    planted_customer: "bg-green-50 text-green-700 border-green-200",
    rehab: "bg-pink-50 text-pink-700 border-pink-200",
    dead: "bg-slate-100 text-slate-700 border-slate-300",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    lost: "bg-red-50 text-red-700 border-red-200",
};

const statusLabelMap: Record<string, string> = {
    in_zone: "อยู่ในแปลง",
    available: "อยู่ในแปลง", // legacy alias → map to in_zone meaning
    selected_for_dig: "เลือกไว้จะขุด",
    root_prune_1: "ตัดราก 1",
    root_prune_2: "ตัดราก 2",
    root_prune_3: "ตัดราก 3",
    root_prune_4: "ตัดราก 4",
    ready_to_lift: "พร้อมยก/พร้อมขาย",
    reserved: "จองแล้ว",
    dig_ordered: "อยู่ในใบสั่งขุด",
    dug: "ขุดแล้ว",
    shipped: "ส่งมอบแล้ว",
    planted: "ปลูกให้ลูกค้าแล้ว",
    planted_customer: "ปลูกให้ลูกค้าแล้ว",
    rehab: "พักฟื้น",
    dead: "ตาย",
    cancelled: "ยกเลิก",
    lost: "สูญหาย",
};

type TagLayoutKey = "big_3x5" | "medium_4x6";

const TAG_PRINT_LAYOUTS: Record<
    TagLayoutKey,
    {
        label: string;
        columns: number;
        gapMm: number;
        cardHeightMm: number;
    }
> = {
    big_3x5: {
        label: "3 × 5 (Tag ใหญ่ 5×5 cm)",
        columns: 3,
        gapMm: 6, // ใช้เป็น column-gap
        cardHeightMm: 42,
    },
    medium_4x6: {
        label: "4 × 6 (Tag กลาง)",
        columns: 4,
        gapMm: 4,
        cardHeightMm: 40,
    },
};

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL ?? "https://app.avacrm.com";

type CreateTagModalProps = {
    zoneId: string;
    form: any;
    setForm: (fn: (prev: any) => any) => void;
    onClose: () => void;
    onSaved: () => void;
    saving: boolean;
    setSaving: (val: boolean) => void;
    speciesOptions: any[];
};

const CreateTagModal: React.FC<CreateTagModalProps> = ({
    zoneId,
    form,
    setForm,
    onClose,
    onSaved,
    saving,
    setSaving,
    speciesOptions,
}) => {
    const [isBatch, setIsBatch] = React.useState(false);

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

    // Calculate remaining and validation
    // CRITICAL: Count TREES not TAGS. For batch: totalTrees = qtyPerTag * tagsCount
    const qtyPerTag = Number(form.qty || 1);
    const tagsCount = Number(form.tagsCount || 10);
    const requestedTrees = isBatch ? (qtyPerTag * tagsCount) : qtyPerTag;
    const remainingQty = inv ? Math.max(inv.planted_qty - taggedQty, 0) : 0;
    const canSave = !!inv && requestedTrees > 0 && requestedTrees <= remainingQty && !loadingInv && !!form.speciesId && !!form.sizeLabel;

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

        let error;

        if (isBatch) {
            const { error: batchError } = await supabase.rpc("create_tree_tags_batch", {
                p_zone_id: zoneId,
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
            const { error: singleError } = await supabase.rpc("create_tree_tag", {
                p_zone_id: zoneId,
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
            // Parse friendly error message
            const msg = error.message || "";
            if (msg.includes("ไม่พบข้อมูล Inventory") || msg.includes("ไม่พบ Inventory")) {
                alert("ไม่พบ Inventory ของขนาดนี้ กรุณาเพิ่ม Inventory ก่อน");
            } else if (msg.includes("เกินจำนวน") || msg.includes("เกิน")) {
                alert(`จำนวนที่ต้องการสร้างเกินคงเหลือ (คงเหลือ ${remainingQty} ต้น)`);
            } else {
                alert("ไม่สามารถสร้าง Tag ได้: " + msg);
            }
            return;
        }

        // สำเร็จ
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
                                    {inv.created_tag_qty !== taggedQty && (
                                        <p className="text-[10px] text-amber-600 mt-1">
                                            ⚠️ ข้อมูล created_tag_qty ({inv.created_tag_qty}) ไม่ตรงกับจำนวน Tag จริง ({taggedQty}) - อาจมีข้อมูลเก่า
                                        </p>
                                    )}
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

export const ZoneTreeTagsTable: React.FC<ZoneTreeTagsTableProps> = ({ zoneId, onTagsChanged }) => {
    const { rows, loading, error, reload } = useZoneTreeTags(zoneId);

    const [showCreate, setShowCreate] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const [form, setForm] = React.useState({
        speciesId: "",
        sizeLabel: "",
        qty: 1,
        tagsCount: 10,
        row: "",
        position: "",
        notes: "",
    });

    // Print Selection State
    const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
    const [printRows, setPrintRows] = React.useState<any[] | null>(null);
    const [showPrintModal, setShowPrintModal] = React.useState(false);
    const [layoutKey, setLayoutKey] = React.useState<TagLayoutKey>("big_3x5");

    // Pagination State
    const [pageSize, setPageSize] = React.useState<number>(20);
    const [currentPage, setCurrentPage] = React.useState<number>(1);

    const totalPages = Math.ceil(rows.length / pageSize);
    const pagedRows = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return rows.slice(start, start + pageSize);
    }, [rows, currentPage, pageSize]);

    // Reset to page 1 when pageSize changes or data reloads
    React.useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, rows.length]);

    const toggleSelect = (id: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedTagIds.length === rows.length) {
            setSelectedTagIds([]);
        } else {
            setSelectedTagIds(rows.map((r) => r.id));
        }
    };

    const handlePrintSelectedTags = async () => {
        // 0) กันเคสไม่ได้เลือกอะไร
        if (!rows || rows.length === 0) return;
        const selectedRows = rows.filter((r) => selectedTagIds.includes(r.id));
        if (selectedRows.length === 0) {
            alert("กรุณาเลือก Tag อย่างน้อย 1 ใบ");
            return;
        }

        try {
            // 1) เตรียม data พร้อม QR สำหรับทุก row
            const tagWithQrList = await Promise.all(
                selectedRows.map(async (tag) => {
                    // QR Content เป็น URL
                    const qrContent = `${APP_BASE_URL}/tag/${encodeURIComponent(tag.tag_code)}`;
                    const qrDataUrl = await QRCode.toDataURL(qrContent, {
                        margin: 1,
                        scale: 3,
                    });

                    return { tag, qrDataUrl };
                })
            );

            // 2) เปิดหน้าต่าง print
            const printWindow = window.open("", "_blank", "width=1024,height=768");
            if (!printWindow) {
                alert("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ (popup ถูกบล็อก)");
                return;
            }

            // Config Layout
            const layout = TAG_PRINT_LAYOUTS[layoutKey];

            // 3) สร้าง HTML การ์ดทุกใบเป็น grid
            const cardsHtml = tagWithQrList
                .map(({ tag, qrDataUrl }) => {
                    const tagCode = tag.tag_code;
                    const species =
                        tag.species_name_th || tag.species_name_en || "";
                    const sizeLabel = tag.size_label || "";
                    const zoneName = tag.zone_name || "";
                    const row = tag.planting_row ?? "";
                    const pos = tag.planting_position ?? "";
                    const notes = tag.notes || "";

                    return `
          <div class="tag-card">
            <div class="tag-code">${tagCode}</div>
            <div>${species}</div>
            <div>ขนาด ${sizeLabel}</div>
            <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
            <div class="tag-meta">
              แปลง: ${zoneName || "-"}<br/>
              แถว ${row || "-"} / ต้นที่ ${pos || "-"}
            </div>
            ${notes
                            ? `<div class="notes">หมายเหตุ: ${notes.replace(/</g, "&lt;")}</div>`
                            : ""
                        }
          </div>
        `;
                })
                .join("");

            const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>Print Tags (${tagWithQrList.length})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 0;
            padding: 0;
          }
          .sheet {
            width: 100%;
            min-height: 100vh;
            display: grid;
            justify-content: center;
            padding: 0;
            margin: 0;
          }
          /* Grid Layout Dynamic */
          .grid {
            display: grid;
            grid-template-columns: repeat(${layout.columns}, 1fr);
            column-gap: ${layout.gapMm}mm;
            row-gap: 10mm;
            width: 100%;
          }
          .tag-card {
            border: 1px solid #333;
            border-radius: 4px;
            padding: 4mm 5mm;
            text-align: center;
            font-size: 10pt;
            page-break-inside: avoid;

            /* Dynamic Height */
            width: 58mm;
            height: ${layout.cardHeightMm}mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .tag-code {
            font-weight: 700;
            font-size: 11pt;
            margin-bottom: 1mm;
          }
          .qr-img {
            width: 22mm;
            height: 22mm;
            margin: 2mm auto;
          }
          .tag-meta {
            margin-top: 1mm;
            line-height: 1.3;
          }
          .notes {
            margin-top: 1mm;
            font-size: 8pt;
          }

          @media print {
            body {
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="grid">
            ${cardsHtml}
          </div>
        </div>
        <script>
          window.print();
        </script>
      </body>
      </html>
    `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        } catch (err: any) {
            console.error("Print selected tags error", err);
            alert("ไม่สามารถพิมพ์ Tag ที่เลือกได้: " + (err?.message || err));
        }
    };

    // Load species options
    const [speciesOptions, setSpeciesOptions] = React.useState<any[]>([]);
    React.useEffect(() => {
        let cancelled = false;
        async function loadSpecies() {
            const { data } = await supabase
                .from("stock_species")
                .select("id, name_th")
                .order("name_th", { ascending: true });
            if (!cancelled) setSpeciesOptions(data || []);
        }
        loadSpecies();
        return () => { cancelled = true; };
    }, []);

    const handleOpenCreate = () => {
        setForm((prev) => ({ ...prev, qty: 1 }));
        setShowCreate(true);
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        // Could add a toast notification here
    };

    const handlePrintTag = async (tag: any) => {
        try {
            // 1) ข้อมูลที่จะ encode ใน QR
            const qrContent = `${APP_BASE_URL}/tag/${encodeURIComponent(tag.tag_code)}`;

            // 2) สร้าง dataURL ของ QR (PNG base64)
            const qrDataUrl = await QRCode.toDataURL(qrContent, {
                margin: 1,
                scale: 4, // ยิ่งมากยิ่งละเอียด
            });

            // 3) เปิดหน้าต่างพิมพ์
            const printWindow = window.open("", "_blank", "width=800,height=600");
            if (!printWindow) {
                alert("ไม่สามารถเปิดหน้าต่างพิมพ์ได้ (popup ถูกบล็อก)");
                return;
            }

            // 4) เตรียมข้อมูลจาก row
            const tagCode = tag.tag_code;
            const species = tag.species_name_th || tag.species_name_en || "";
            const sizeLabel = tag.size_label || "";
            const zoneName = tag.zone_name || "";
            const row = tag.planting_row ?? "";
            const pos = tag.planting_position ?? "";
            const notes = tag.notes || "";

            // 5) HTML หน้า print (1 การ์ด)
            const html = `
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8" />
                <title>Print Tag ${tagCode}</title>
                <style>
                @page {
                    margin: 5mm;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    margin: 0;
                    padding: 0;
                }
                .tag-sheet {
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .tag-card {
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 8px 10px;
                    width: 260px;
                    text-align: center;
                    font-size: 12px;
                }
                .tag-code {
                    font-weight: 700;
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                .qr-img {
                    width: 80px;
                    height: 80px;
                    margin: 6px auto;
                }
                .tag-meta {
                    margin-top: 4px;
                    line-height: 1.3;
                }
                .notes {
                    margin-top: 4px;
                    font-size: 10px;
                }
                </style>
            </head>
            <body>
                <div class="tag-sheet">
                <div class="tag-card">
                    <div class="tag-code">${tagCode}</div>
                    <div>${species}</div>
                    <div>ขนาด ${sizeLabel}</div>

                    <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />

                    <div class="tag-meta">
                    แปลง: ${zoneName || "-"}<br/>
                    แถว ${row || "-"} / ต้นที่ ${pos || "-"}
                    </div>

                    ${notes ? `<div class="notes">หมายเหตุ: ${notes.replace(/</g, "&lt;")}</div>` : ""}
                </div>
                </div>
                <script>
                window.print();
                </script>
            </body>
            </html>
            `;

            // 6) เขียน HTML ลงหน้าต่างแล้วสั่ง print
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        } catch (err: any) {
            console.error("Print tag error", err);
            alert("สร้าง QR เพื่อพิมพ์ Tag ไม่ได้: " + (err?.message || err));
        }
    };

    const handleDeleteTag = async (id: string, code: string) => {
        if (!window.confirm(`คุณต้องการลบ Tag: ${code} ใช่หรือไม่ ? `)) {
            return;
        }

        const { error } = await supabase.from("tree_tags").delete().eq("id", id);

        if (error) {
            console.error("delete tag error", error);
            alert("ไม่สามารถลบ Tag ได้: " + error.message);
        } else {
            reload();
            await onTagsChanged?.(); // refresh totals
        }
    };

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        รายการ QR / Tag ในแปลงนี้
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        จัดการ Tag ระบุตัวตนต้นไม้ (QR/NFC) เพื่อติดตามสถานะรายต้น
                    </p>
                </div>
                <div>
                    <div className="flex gap-2">
                        <select
                            value={layoutKey}
                            onChange={(e) => setLayoutKey(e.target.value as TagLayoutKey)}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                        >
                            {Object.entries(TAG_PRINT_LAYOUTS).map(([key, cfg]) => (
                                <option key={key} value={key}>
                                    {cfg.label}
                                </option>
                            ))}
                        </select>
                        <button
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={selectedTagIds.length === 0}
                            onClick={handlePrintSelectedTags}
                        >
                            <Printer className="h-4 w-4" />
                            พิมพ์ ({selectedTagIds.length})
                        </button>
                        <button
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                            onClick={handleOpenCreate}
                        >
                            <Plus className="h-4 w-4" />
                            สร้าง Tag ใหม่
                        </button>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="py-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    กำลังโหลดข้อมูล Tag...
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    ไม่สามารถโหลดข้อมูล Tag ได้: {error}
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">
                    ยังไม่มี Tag ในแปลงนี้
                </div>
            )}

            {!loading && !error && rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-600">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <th className="px-3 py-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={selectedTagIds.length === rows.length && rows.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                </th>
                                <th className="px-3 py-2">Tag / QR Code</th>
                                <th className="px-3 py-2">ชนิด / พันธุ์ไม้</th>
                                <th className="px-3 py-2">ขนาด</th>
                                <th className="px-3 py-2 text-right">จำนวน</th>
                                <th className="px-3 py-2">สถานะ</th>
                                <th className="px-3 py-2">ตำแหน่ง</th>
                                <th className="px-3 py-2 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedRows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedTagIds.includes(row.id)}
                                            onChange={() => toggleSelect(row.id)}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <QrCode className="h-4 w-4 text-slate-400" />
                                            {row.tag_code}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.species_name_th || "-"}
                                    </td>
                                    <td className="px-3 py-2">
                                        {row.size_label || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {row.qty.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={
                                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
                                                (statusBadgeMap[row.status] ||
                                                    "bg-slate-100 text-slate-700 border-slate-200")
                                            }
                                        >
                                            {statusLabelMap[row.status] || row.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        {row.planting_row
                                            ? `แถว ${row.planting_row} `
                                            : "-"}{" "}
                                        {row.planting_position
                                            ? `/ ต้นที่ ${row.planting_position} `
                                            : ""}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleCopyCode(row.tag_code)}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                title="คัดลอกรหัส"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePrintTag(row)}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                title="พิมพ์ Tag"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTag(row.id, row.tag_code)}
                                                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                title="ลบ Tag"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 px-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span>แสดง</span>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                                {[10, 20, 50, 100].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                            <span>รายการ</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span>
                                แสดง {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, rows.length)} จาก {rows.length} รายการ
                            </span>
                            <div className="flex gap-1">
                                <button
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ก่อนหน้า
                                </button>
                                <span className="px-2 py-1">
                                    หน้า {currentPage} / {totalPages || 1}
                                </span>
                                <button
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreate && (
                <CreateTagModal
                    zoneId={zoneId}
                    form={form}
                    setForm={setForm}
                    onClose={() => setShowCreate(false)}
                    onSaved={async () => {
                        setShowCreate(false);
                        reload();
                        await onTagsChanged?.(); // refresh totals
                    }}
                    saving={saving}
                    setSaving={setSaving}
                    speciesOptions={speciesOptions}
                />
            )}

            <PrintTagsModal
                open={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                rows={printRows || []}
            />
        </div>
    );
};
