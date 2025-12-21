import React, { useState } from "react";
import { Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useZoneDigPlans } from "../../../hooks/useZoneDigPlans";
import { useDigPlanActions } from "../../../hooks/useDigPlanActions";

function shortId(id: string) {
    return id.slice(0, 8);
}

function openOrder(orderId: string) {
    window.location.href = `/zone-digup-orders/${orderId}`;
}

type Props = {
    zoneId: string;
    onJumpToOrder?: (orderId: string) => void;
};

export function ZoneDigPlanTab({ zoneId, onJumpToOrder }: Props) {
    const { plans, itemsByPlan, summary, loading, error, refetchPlans, fetchItems } = useZoneDigPlans(zoneId);
    const { promoteToZoneDigupOrder, working, error: actionError } = useDigPlanActions();

    const [openPlanId, setOpenPlanId] = useState<string | null>(null);

    async function onToggle(planId: string) {
        const next = openPlanId === planId ? null : planId;
        setOpenPlanId(next);
        if (next) await fetchItems(planId);
    }

    async function onPromote(planId: string) {
        const digupDate = new Date();
        digupDate.setDate(digupDate.getDate() + 1);
        const yyyyMmDd = digupDate.toISOString().slice(0, 10);

        await promoteToZoneDigupOrder(planId, yyyyMmDd);
        await refetchPlans();
        if (openPlanId === planId) await fetchItems(planId);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-lg font-semibold">Dig Plans</div>
                    <div className="text-sm text-slate-500">
                        Draft/Active plans for this zone. Promote to create Zone Digup Order.
                    </div>
                </div>
                <button
                    onClick={refetchPlans}
                    className="px-3 py-2 rounded-lg border hover:bg-slate-100 text-sm"
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-xs text-slate-500">Draft Plans</div>
                    <div className="text-lg font-semibold">{plans.filter((p) => p.status === "draft").length}</div>
                </div>

                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-xs text-slate-500">Linked Orders</div>
                    <div className="text-lg font-semibold">{plans.filter((p) => !!p.zone_digup_order_id).length}</div>
                </div>

                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-xs text-slate-500">Pending Promote</div>
                    <div className="text-lg font-semibold">{plans.filter((p) => !p.zone_digup_order_id).length}</div>
                </div>

                <div className="p-3 rounded-xl border bg-white">
                    <div className="text-xs text-slate-500">Planned Qty (Total)</div>
                    <div className="text-lg font-semibold">{(summary ?? []).reduce((sum, r) => sum + (r.planned_qty ?? 0), 0)}</div>
                    <div className="text-xs text-slate-500">Tags: {(summary ?? []).reduce((sum, r) => sum + (r.planned_tags ?? 0), 0)}</div>
                </div>
            </div>

            {(error || actionError) && (
                <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-700">
                    {error || actionError}
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading plans...
                </div>
            ) : plans.length === 0 ? (
                <div className="p-4 rounded-xl border text-sm text-slate-500">
                    No dig plans yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {plans.map((p) => {
                        const isOpen = openPlanId === p.id;
                        const items = itemsByPlan[p.id] ?? [];
                        const qty = items.filter((x) => x.is_active).reduce((s, x) => s + (x.qty ?? 1), 0);

                        return (
                            <div key={p.id} className="rounded-xl border bg-white">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{p.status.toUpperCase()}</span>
                                            <span className="text-xs text-slate-500">#{p.id.slice(0, 8)}</span>
                                            {p.zone_digup_order_id && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Linked Order
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {p.target_date_from ?? "—"} → {p.target_date_to ?? "—"} | Confidence: {p.confidence_level}
                                        </div>
                                        {p.plan_reason && <div className="text-sm text-slate-600">{p.plan_reason}</div>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-3 py-2 rounded-lg border hover:bg-slate-100 text-sm"
                                            onClick={() => onToggle(p.id)}
                                        >
                                            {isOpen ? (
                                                <span className="flex items-center gap-1"><ChevronUp className="h-4 w-4" />Hide</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><ChevronDown className="h-4 w-4" />Items</span>
                                            )}
                                        </button>

                                        {!p.zone_digup_order_id ? (
                                            <button
                                                className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60 hover:bg-slate-800 transition-colors"
                                                onClick={() => onPromote(p.id)}
                                                disabled={working || p.status === 'completed' || p.status === 'cancelled'}
                                                title="Create Zone Digup Order + mark tags dig_ordered"
                                            >
                                                {working ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Promoting...
                                                    </span>
                                                ) : (
                                                    "Promote"
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
                                                    Order: <span className="font-mono">#{shortId(p.zone_digup_order_id!)}</span>
                                                </span>

                                                <button
                                                    className="px-3 py-2 rounded-lg border hover:bg-slate-100 text-sm"
                                                    onClick={() => onJumpToOrder?.(p.zone_digup_order_id!)}
                                                    title="ไปที่ใบขุด"
                                                >
                                                    ไปที่ใบขุด
                                                </button>

                                                <button
                                                    className="px-3 py-2 rounded-lg border hover:bg-slate-100 text-sm"
                                                    onClick={() => navigator.clipboard.writeText(p.zone_digup_order_id!)}
                                                    title="Copy order id"
                                                >
                                                    Copy Order ID
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="px-4 pb-4">
                                        <div className="text-sm text-slate-500 mb-2">
                                            Items: {items.length} | Qty: {qty}
                                        </div>
                                        <div className="rounded-lg border overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-left p-2 font-medium text-slate-600">Tag</th>
                                                        <th className="text-left p-2 font-medium text-slate-600">Size</th>
                                                        <th className="text-left p-2 font-medium text-slate-600">Grade</th>
                                                        <th className="text-right p-2 font-medium text-slate-600">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((it) => (
                                                        <tr key={it.id} className="border-t border-slate-100">
                                                            <td className="p-2 font-mono text-xs text-slate-600">{it.tag_id.slice(0, 8)}…</td>
                                                            <td className="p-2 text-slate-700">{it.size_label ?? "—"}</td>
                                                            <td className="p-2 text-slate-700">{it.grade ?? "—"}</td>
                                                            <td className="p-2 text-right text-slate-700">{it.qty}</td>
                                                        </tr>
                                                    ))}
                                                    {items.length === 0 && (
                                                        <tr>
                                                            <td className="p-3 text-sm text-slate-400" colSpan={4}>
                                                                No items loaded yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
