"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { TreeTagStatus } from "../../lib/treeTagWorkflow";
import { STATUS_LABEL_TH, getNextAction, POST_DUG_ACTIONS } from "../../lib/treeTagWorkflow";

type TagRow = {
    tag_id: string;
    tag_code: string;
    status: TreeTagStatus;
    size_label?: string | null;
    grade?: string | null;
};

type Props = {
    rows: TagRow[];
    onChanged?: () => Promise<void> | void;
};

export default function DigupWorkflowTracker({ rows, onChanged }: Props) {
    const [busyId, setBusyId] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => a.tag_code.localeCompare(b.tag_code));
    }, [rows]);

    async function setStatus(tagId: string, toStatus: TreeTagStatus) {
        setErr(null);
        setBusyId(tagId);
        try {
            const { data: u } = await supabase.auth.getUser();
            const userId = u?.user?.id ?? null;

            const { error } = await supabase.rpc("set_tree_tag_status_v1", {
                p_tag_id: tagId,
                p_to_status: toStatus,
                p_source: "ui",
                p_notes: "Digup workflow update",
                p_force: false,
                p_changed_by: userId,
            });

            if (error) throw error;
            await onChanged?.();
        } catch (e: any) {
            setErr(e?.message ?? "Update failed");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="mt-4 rounded-xl border bg-white p-4">
            <div className="mb-2">
                <div className="text-base font-semibold">ติดตามการตัดราก (Workflow)</div>
                <div className="text-sm text-gray-600">
                    เลื่อนสถานะตามขั้นตอน: selected_for_dig → ตัดราก 1–4 → พร้อมยก → ขุดแล้ว → (พัก/เข้า stock/ส่ง/ปลูก)
                </div>
            </div>

            {err && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            <div className="overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr className="text-left">
                            <th className="p-3">Tag</th>
                            <th className="p-3">ขนาด</th>
                            <th className="p-3">เกรด</th>
                            <th className="p-3">สถานะ</th>
                            <th className="p-3">การทำงาน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r) => {
                            const next = getNextAction(r.status);
                            const isBusy = busyId === r.tag_id;

                            return (
                                <tr key={r.tag_id} className="border-t">
                                    <td className="p-3 font-medium">{r.tag_code}</td>
                                    <td className="p-3">{r.size_label ?? "-"}</td>
                                    <td className="p-3">{r.grade ?? "-"}</td>
                                    <td className="p-3">{STATUS_LABEL_TH[r.status] ?? r.status}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-2">
                                            {/* step next */}
                                            {next && (
                                                <button
                                                    className="rounded-lg border px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                                                    disabled={isBusy}
                                                    onClick={() => setStatus(r.tag_id, next.toStatus)}
                                                >
                                                    {isBusy ? "กำลังบันทึก..." : next.label}
                                                </button>
                                            )}

                                            {/* post-dug choices */}
                                            {r.status === "dug" && (
                                                <>
                                                    {POST_DUG_ACTIONS.map((a) => (
                                                        <button
                                                            key={a.toStatus}
                                                            className="rounded-lg border px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                                                            disabled={isBusy}
                                                            onClick={() => setStatus(r.tag_id, a.toStatus)}
                                                        >
                                                            {isBusy ? "กำลังบันทึก..." : a.label}
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* allow rehab/dead quickly */}
                                            {r.status !== "dead" && (
                                                <button
                                                    className="rounded-lg border px-3 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                    disabled={isBusy}
                                                    onClick={() => setStatus(r.tag_id, "rehab")}
                                                >
                                                    พักฟื้น
                                                </button>
                                            )}
                                            {r.status !== "dead" && (
                                                <button
                                                    className="rounded-lg border px-3 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                                                    disabled={isBusy}
                                                    onClick={() => setStatus(r.tag_id, "dead")}
                                                >
                                                    ตาย
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {sorted.length === 0 && (
                            <tr>
                                <td className="p-4 text-gray-500" colSpan={5}>
                                    ยังไม่มีรายการ Tag ในคำสั่งขุดล้อมนี้
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
