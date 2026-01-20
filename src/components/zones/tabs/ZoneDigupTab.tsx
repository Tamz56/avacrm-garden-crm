// src/components/zones/tabs/ZoneDigupTab.tsx
"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useZoneDigupOrderWorkflow } from "../../../hooks/useZoneDigupOrderWorkflow";
import DigupWorkflowTracker from "../../digup/DigupWorkflowTracker";
import type { TreeTagStatus } from "../../../lib/treeTagWorkflow";

// Valid TreeTagStatus values for runtime guard
const VALID_STATUSES: readonly TreeTagStatus[] = [
    "in_zone",
    "available",
    "planned_for_dig",
    "selected_for_dig",
    "root_prune_1",
    "root_prune_2",
    "root_prune_3",
    "root_prune_4",
    "ready_to_lift",
    "dug",
    "dug_hold",
    "in_stock",
    "shipped",
    "planted",
    "rehab",
    "dead",
] as const;

function isValidTreeTagStatus(value: unknown): value is TreeTagStatus {
    return typeof value === "string" && VALID_STATUSES.includes(value as TreeTagStatus);
}

// TagRow type matching DigupWorkflowTracker's expected props
type TagRow = {
    tag_id: string;
    tag_code: string;
    status: TreeTagStatus;
    size_label?: string | null;
    grade?: string | null;
};

type Props = {
    zoneId: string;
    zone?: unknown;
    onReload?: () => void;
};

export function ZoneDigupTab({ zoneId, onReload }: Props) {
    const { orders, rowsByOrderId, loading, error, refetch } = useZoneDigupOrderWorkflow(zoneId);
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);

    function toggleOrder(orderId: string) {
        if (openOrderId === orderId) {
            setOpenOrderId(null);
        } else {
            setOpenOrderId(orderId);
        }
    }

    function formatDate(d: string | null) {
        if (!d) return "-";
        return new Date(d).toLocaleDateString("th-TH");
    }

    function statusLabel(s: string | null) {
        switch (s) {
            case "planned": return "วางแผน";
            case "in_progress": return "กำลังดำเนินการ";
            case "done": return "เสร็จแล้ว";
            case "cancelled": return "ยกเลิก";
            default: return s ?? "-";
        }
    }

    /**
     * Map raw rows to TagRow[] for DigupWorkflowTracker
     * - Filter: only rows with valid tag_id, tag_code (non-empty string), and valid tag_status
     * - Type-safe: uses runtime guard for TreeTagStatus validation
     */
    function getTagRows(orderId: string): TagRow[] {
        const raw = rowsByOrderId[orderId] ?? [];

        return raw
            .filter((r): r is typeof r & { tag_id: string; tag_code: string; tag_status: TreeTagStatus } => {
                // Must have non-empty tag_id
                if (typeof r.tag_id !== "string" || r.tag_id.trim() === "") return false;
                // Must have non-empty tag_code
                if (typeof r.tag_code !== "string" || r.tag_code.trim() === "") return false;
                // Must have valid TreeTagStatus
                if (!isValidTreeTagStatus(r.tag_status)) return false;
                return true;
            })
            .map((r): TagRow => ({
                tag_id: r.tag_id,
                tag_code: r.tag_code,
                status: r.tag_status,
                size_label: r.tag_size_label ?? null,
                grade: r.tag_grade ?? null,
            }));
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold">คำสั่งขุดล้อม (Zone Digup Orders)</div>
                    <div className="text-sm text-slate-500">
                        รายการคำสั่งขุดล้อมของโซนนี้ พร้อมติดตามสถานะตัดราก
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-2 rounded-lg border hover:bg-slate-100 text-sm"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading && orders.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลด...
                </div>
            )}

            {!loading && orders.length === 0 && (
                <div className="p-4 rounded-xl border bg-white text-sm text-slate-500">
                    ยังไม่มีคำสั่งขุดล้อมในโซนนี้
                </div>
            )}

            {/* Orders List */}
            <div className="space-y-3">
                {orders.map((o) => {
                    const tagRows = getTagRows(o.id);

                    return (
                        <div key={o.id} className="rounded-xl border bg-white overflow-hidden">
                            {/* Order Header */}
                            <button
                                className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50"
                                onClick={() => toggleOrder(o.id)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">
                                            วันที่ขุด: {formatDate(o.digup_date)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${o.status === "done" ? "bg-green-100 text-green-700" :
                                                o.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                                                    o.status === "cancelled" ? "bg-red-100 text-red-700" :
                                                        "bg-slate-100 text-slate-700"
                                            }`}>
                                            {statusLabel(o.status)}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            จำนวน: {o.qty} ต้น
                                        </span>
                                    </div>
                                    {o.notes && (
                                        <div className="text-sm text-slate-500 mt-1">
                                            {o.notes}
                                        </div>
                                    )}
                                    {o.source_plan_id && (
                                        <div className="text-xs text-slate-400 mt-1">
                                            จาก Dig Plan: {o.source_plan_id.slice(0, 8)}...
                                        </div>
                                    )}
                                </div>
                                {openOrderId === o.id ? (
                                    <ChevronUp className="h-5 w-5 text-slate-400" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                )}
                            </button>

                            {/* Order Items (Expanded) */}
                            {openOrderId === o.id && (
                                <div className="border-t bg-slate-50 p-4">
                                    {tagRows.length === 0 ? (
                                        <div className="text-sm text-slate-500">
                                            ไม่มีรายการ Tag ในคำสั่งนี้
                                        </div>
                                    ) : (
                                        <DigupWorkflowTracker
                                            rows={tagRows}
                                            onChanged={async () => {
                                                await refetch();
                                                onReload?.();
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ZoneDigupTab;
