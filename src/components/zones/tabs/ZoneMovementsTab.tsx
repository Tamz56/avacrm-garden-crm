import React from "react";
import { supabase } from "../../../supabaseClient";

type MovementTagRow = {
    id: string;
    tag_code: string | null;
    size_label: string | null;
    qty: number | null;
    status: string | null;
};

type Props = {
    zoneId: string;
};

export const ZoneMovementsTab: React.FC<Props> = ({ zoneId }) => {
    const [loading, setLoading] = React.useState(false);
    const [moving, setMoving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [rows, setRows] = React.useState<MovementTagRow[]>([]);
    const [selected, setSelected] = React.useState<Record<string, boolean>>({});
    const [note, setNote] = React.useState<string>("");

    const selectedIds = React.useMemo(
        () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
        [selected]
    );

    const fetchDugTags = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // v1: แสดงเฉพาะ tag ที่ status = 'dug' เพื่อส่งเข้า stock (ready_for_sale)
            const { data, error } = await supabase
                .from("tree_tags")
                .select("id, tag_code, size_label, qty, status")
                .eq("zone_id", zoneId)
                .eq("status", "dug")
                .order("tag_code", { ascending: true });

            if (error) throw error;

            const safe = (data ?? []) as MovementTagRow[];
            setRows(safe);

            // เคลียร์ selection ของ id ที่ไม่อยู่ใน list แล้ว
            setSelected((prev) => {
                const next: Record<string, boolean> = {};
                for (const r of safe) {
                    if (prev[r.id]) next[r.id] = true;
                }
                return next;
            });
        } catch (e: any) {
            setError(e?.message ?? "โหลดรายการไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [zoneId]);

    React.useEffect(() => {
        if (!zoneId) return;
        fetchDugTags();
    }, [zoneId, fetchDugTags]);

    const toggleAll = (checked: boolean) => {
        if (!checked) {
            setSelected({});
            return;
        }
        const next: Record<string, boolean> = {};
        for (const r of rows) next[r.id] = true;
        setSelected(next);
    };

    const toggleOne = (id: string, checked: boolean) => {
        setSelected((prev) => ({ ...prev, [id]: checked }));
    };

    const onMoveToStock = async () => {
        setError(null);

        if (selectedIds.length === 0) {
            setError("กรุณาเลือกอย่างน้อย 1 Tag ที่ต้องการส่งเข้า Stock");
            return;
        }

        setMoving(true);
        try {
            const { error } = await supabase.rpc("move_tags_to_stock", {
                p_tag_ids: selectedIds,
                p_notes: note?.trim() ? note.trim() : null,
            });

            if (error) throw error;

            // data = จำนวนที่ย้ายสำเร็จ (integer)
            // รีเฟรช list ให้หายไป (เพราะไม่ใช่ dug แล้ว)
            setNote("");
            setSelected({});
            await fetchDugTags();
        } catch (e: any) {
            // เคสหลัก: มี tag ใดไม่ใช่ dug -> RPC raise exception
            setError(e?.message ?? "ส่งเข้า Stock ไม่สำเร็จ");
        } finally {
            setMoving(false);
        }
    };

    const allChecked = rows.length > 0 && selectedIds.length === rows.length;
    const anyChecked = selectedIds.length > 0;

    return (
        <div className="space-y-4">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800">ย้าย/เคลื่อนย้าย (Movements)</h3>
                        <p className="text-xs text-slate-500">
                            v1: เลือก Tag ที่ขุดล้อมแล้ว (<span className="font-medium">dug</span>) เพื่อส่งเข้า Stock เป็นสถานะ{" "}
                            <span className="font-medium">ready_for_sale</span>
                        </p>
                    </div>
                    <button
                        onClick={fetchDugTags}
                        disabled={loading || moving}
                        className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                        รีเฟรช
                    </button>
                </div>

                {error && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {error}
                    </div>
                )}

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-slate-600 border-b">
                                <th className="py-2 pr-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={(e) => toggleAll(e.target.checked)}
                                        disabled={loading || moving || rows.length === 0}
                                    />
                                </th>
                                <th className="py-2 pr-3">Tag</th>
                                <th className="py-2 pr-3">ขนาด</th>
                                <th className="py-2 pr-3">จำนวน</th>
                                <th className="py-2 pr-3">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td className="py-4 text-slate-500" colSpan={5}>
                                        กำลังโหลดรายการ…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td className="py-4 text-slate-500" colSpan={5}>
                                        ไม่มี Tag สถานะ <span className="font-medium">dug</span> ในโซนนี้
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.id} className="border-b last:border-b-0">
                                        <td className="py-2 pr-3">
                                            <input
                                                type="checkbox"
                                                checked={!!selected[r.id]}
                                                onChange={(e) => toggleOne(r.id, e.target.checked)}
                                                disabled={moving}
                                            />
                                        </td>
                                        <td className="py-2 pr-3 font-medium text-slate-800">{r.tag_code ?? "-"}</td>
                                        <td className="py-2 pr-3 text-slate-700">{r.size_label ?? "-"}</td>
                                        <td className="py-2 pr-3 text-slate-700">{r.qty ?? 1}</td>
                                        <td className="py-2 pr-3">
                                            <span className="text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-700">
                                                {r.status ?? "-"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 grid gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ (ไม่บังคับ)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            disabled={moving}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="เช่น ส่งเข้าแผงขายไม้, ตรวจรากแล้ว, พร้อมถ่ายรูปลงสต็อก"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            เลือกแล้ว: <span className="font-medium text-slate-800">{selectedIds.length}</span> รายการ
                        </div>

                        <button
                            onClick={onMoveToStock}
                            disabled={moving || loading || !anyChecked}
                            className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                            {moving ? "กำลังส่งเข้า Stock…" : "ส่งเข้า Stock (พร้อมขาย)"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
