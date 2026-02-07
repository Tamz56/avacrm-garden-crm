import React, { useState, useRef, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp, Plus, X, Trash2 } from "lucide-react";
import { useZoneDigPlans } from "../../../hooks/useZoneDigPlans";
import { useDigPlanActions } from "../../../hooks/useDigPlanActions";
import CreateDigPlanModal from "../../digplans/CreateDigPlanModal";

function shortId(id: string) {
    return id.slice(0, 8);
}

// Helper: format date as YYYY-MM-DD in local timezone
function toYmdLocal(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type Props = {
    zoneId: string;
    onJumpToOrder?: (orderId: string) => void;
    isDarkMode?: boolean;
};

export function ZoneDigPlanTab({ zoneId, onJumpToOrder, isDarkMode = false }: Props) {
    const { plans, itemsByPlan, summary, kpi, loading, error, refetchPlans, refetchSummary, fetchItems } = useZoneDigPlans(zoneId);
    const { promoteToZoneDigupOrder, addDigPlanItem, removeDigPlanItem, createDigPlan, searchZoneTags, working, error: actionError } = useDigPlanActions();

    // Debug log (only when zoneId changes)
    useEffect(() => {
        console.log("ZoneDigPlanTab zoneId:", zoneId);
    }, [zoneId]);

    const [openPlanId, setOpenPlanId] = useState<string | null>(null);
    const [promotingPlanId, setPromotingPlanId] = useState<string | null>(null);
    const [createPlanOpen, setCreatePlanOpen] = useState(false);

    // Add item modal state
    const [addForPlanId, setAddForPlanId] = useState<string | null>(null);
    const [tagQuery, setTagQuery] = useState("");
    const [tagOptions, setTagOptions] = useState<{ id: string; tag_code: string }[]>([]);
    const [tagId, setTagId] = useState<string>("");
    const [selectedTagCode, setSelectedTagCode] = useState<string>("");
    const [sizeLabel, setSizeLabel] = useState<string>('6"');
    const [grade, setGrade] = useState<string>("A");
    const [qty, setQty] = useState<number>(1);
    const [notes, setNotes] = useState<string>("");
    const [searchingTags, setSearchingTags] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Debounce & stale guard refs
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchIdRef = useRef<number>(0);

    // Debounced tag search with stale guard
    useEffect(() => {
        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // If query too short, clear options
        if (tagQuery.length < 2) {
            setTagOptions([]);
            setSearchingTags(false);
            return;
        }

        // If tag already selected, don't search
        if (tagId) {
            return;
        }

        setSearchingTags(true);

        debounceRef.current = setTimeout(async () => {
            const currentSearchId = ++searchIdRef.current;

            try {
                const results = await searchZoneTags({ zoneId, q: tagQuery });
                // Stale guard: only update if this is still the latest search
                if (currentSearchId === searchIdRef.current) {
                    setTagOptions(results);
                }
            } catch (err) {
                console.error("searchTags error:", err);
                if (currentSearchId === searchIdRef.current) {
                    setTagOptions([]);
                }
            }

            if (currentSearchId === searchIdRef.current) {
                setSearchingTags(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagQuery, tagId, zoneId]); // searchZoneTags excluded: stable function not needed in deps

    function openAddModal(planId: string) {
        setAddForPlanId(planId);
        setTagQuery("");
        setTagOptions([]);
        setTagId("");
        setSelectedTagCode("");
        setSizeLabel('6"');
        setGrade("A");
        setQty(1);
        setNotes("");
        setAddError(null);
        searchIdRef.current = 0; // Reset search counter
    }

    function closeAddModal() {
        setAddForPlanId(null);
        setAddError(null);
    }

    function clearTagSelection() {
        setTagId("");
        setSelectedTagCode("");
        setTagQuery("");
        setTagOptions([]);
    }

    // Validation: disable Add button if invalid
    const isQtyValid = !isNaN(qty) && qty > 0;
    const canAdd = !working && !!tagId && isQtyValid;

    async function onSubmitAdd() {
        if (!addForPlanId) return;
        if (!tagId) return;
        if (!isQtyValid) return;

        setAddError(null);

        const result = await addDigPlanItem({
            planId: addForPlanId,
            tagId,
            sizeLabel,
            grade,
            qty,
            notes: notes || null,
        });

        if (!result.ok) {
            // Show error in modal, don't close
            setAddError(result.message);
            return;
        }

        // Success: refresh items + summary, close modal
        await fetchItems(addForPlanId);
        await refetchSummary();
        closeAddModal();
    }

    async function onToggle(planId: string) {
        const next = openPlanId === planId ? null : planId;
        setOpenPlanId(next);
        if (next) await fetchItems(planId);
    }

    async function onRemoveItem(itemId: string, planId: string) {
        const yes = window.confirm("ลบรายการนี้ออกจากแผน?");
        if (!yes) return;

        const result = await removeDigPlanItem({ itemId, notes: "removed_from_ui" });

        if (!result.ok) {
            setAddError(result.message);
            return;
        }

        await fetchItems(planId);
        await refetchSummary();
    }

    async function onPromote(planId: string) {
        if (promotingPlanId) return; // Prevent double submit
        setAddError(null);
        setPromotingPlanId(planId);

        try {
            const digupDate = new Date();
            digupDate.setDate(digupDate.getDate() + 1);
            const yyyyMmDd = toYmdLocal(digupDate);

            const result = await promoteToZoneDigupOrder({
                planId,
                digupDate: yyyyMmDd,
                status: "planned",
                notes: "Promote from UI",
            });

            if (!result.ok) {
                setAddError(result.message);
                return;
            }

            // Close the open plan panel first (avoid stale UI)
            if (openPlanId === planId) {
                setOpenPlanId(null);
            }

            // Refresh all (plans + summary + kpi) in one call
            await refetchPlans();

            // Jump to created order
            if (result.orderId && onJumpToOrder) {
                onJumpToOrder(result.orderId);
            }
        } finally {
            setPromotingPlanId(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Dig Plans</div>
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Planned/In-progress plans for this zone. Promote to create Zone Digup Order.
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCreatePlanOpen(true)}
                        className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm flex items-center gap-1"
                        disabled={loading}
                    >
                        <Plus className="h-4 w-4" />New Plan
                    </button>
                    <button
                        onClick={refetchPlans}
                        className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Planned</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{kpi.planned}</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>In-progress</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{kpi.in_progress}</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Linked Orders</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{kpi.linked_orders}</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Pending Promote</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{kpi.pending_promote}</div>
                </div>

                <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Planned Qty (Total)</div>
                    <div className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{(summary ?? []).reduce((sum, r) => sum + (r.planned_qty ?? 0), 0)}</div>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Tags: {(summary ?? []).reduce((sum, r) => sum + (r.planned_tags ?? 0), 0)}</div>
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
                <div className={`p-4 rounded-xl border text-sm ${isDarkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                    No dig plans yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {plans.map((p) => {
                        const isOpen = openPlanId === p.id;
                        const items = itemsByPlan[p.id] ?? [];
                        const qty = items.filter((x) => x.is_active).reduce((s, x) => s + (x.qty ?? 1), 0);

                        return (
                            <div key={p.id} className={`rounded-xl border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{p.status.toUpperCase()}</span>
                                            <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>#{p.id.slice(0, 8)}</span>
                                            {p.promoted_order_id && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    Linked Order
                                                </span>
                                            )}
                                        </div>
                                        <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            {p.target_date_from ?? "—"} → {p.target_date_to ?? "—"} | Confidence: {p.confidence_level}
                                        </div>
                                        {p.plan_reason && <div className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{p.plan_reason}</div>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100"}`}
                                            onClick={() => onToggle(p.id)}
                                        >
                                            {isOpen ? (
                                                <span className="flex items-center gap-1"><ChevronUp className="h-4 w-4" />Hide</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><ChevronDown className="h-4 w-4" />Items</span>
                                            )}
                                        </button>

                                        {/* Add item button */}
                                        {!p.promoted_order_id && (
                                            <button
                                                className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm"
                                                onClick={() => openAddModal(p.id)}
                                                title="Add item to this plan"
                                            >
                                                <span className="flex items-center gap-1"><Plus className="h-4 w-4" />Add</span>
                                            </button>
                                        )}

                                        {!p.promoted_order_id ? (
                                            <button
                                                className="px-3 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60 hover:bg-slate-800 transition-colors"
                                                onClick={() => onPromote(p.id)}
                                                disabled={promotingPlanId !== null || p.status === 'completed' || p.status === 'cancelled'}
                                                title="Create Zone Digup Order + mark tags dig_ordered"
                                            >
                                                {promotingPlanId === p.id ? (
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
                                                    Order: <span className="font-mono">#{shortId(p.promoted_order_id!)}</span>
                                                </span>

                                                <button
                                                    className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100"}`}
                                                    onClick={() => onJumpToOrder?.(p.promoted_order_id!)}
                                                    title="ไปที่ใบขุด"
                                                >
                                                    ไปที่ใบขุด
                                                </button>

                                                <button
                                                    className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100"}`}
                                                    onClick={() => navigator.clipboard.writeText(p.promoted_order_id!)}
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
                                        <div className={`text-sm mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                            Items: {items.length} | Qty: {qty}
                                        </div>
                                        <div className={`rounded-lg border overflow-hidden ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
                                            <table className="w-full text-sm">
                                                <thead className={isDarkMode ? "bg-white/5" : "bg-slate-50"}>
                                                    <tr>
                                                        <th className={`text-left p-2 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Tag</th>
                                                        <th className={`text-left p-2 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Size</th>
                                                        <th className={`text-left p-2 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Grade</th>
                                                        <th className={`text-right p-2 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Qty</th>
                                                        {!p.promoted_order_id && (
                                                            <th className={`text-right p-2 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Action</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((it) => (
                                                        <tr key={it.id} className={`border-t ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                                                            <td className={`p-2 font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{it.tag_code ?? it.tag_id.slice(0, 8)}</td>
                                                            <td className={`p-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{it.size_label ?? "—"}</td>
                                                            <td className={`p-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{it.grade ?? "—"}</td>
                                                            <td className={`p-2 text-right ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{it.qty}</td>
                                                            {!p.promoted_order_id && (
                                                                <td className="p-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                                        onClick={() => onRemoveItem(it.id, p.id)}
                                                                        title="ลบรายการนี้"
                                                                        disabled={working}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {items.length === 0 && (
                                                        <tr>
                                                            <td className={`p-3 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} colSpan={!p.promoted_order_id ? 5 : 4}>
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

            {/* Add Item Modal */}
            {addForPlanId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-md mx-4 ${isDarkMode ? "bg-slate-900 border border-white/10" : "bg-white"}`}>
                        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                            <div>
                                <div className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Add Item to Plan</div>
                                <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Plan #{shortId(addForPlanId)}</div>
                            </div>
                            <button onClick={closeAddModal} className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-600"}`}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Tag Search */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Tag Code</label>
                                <input
                                    type="text"
                                    placeholder="Search tag code..."
                                    className={`w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-black border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200"}`}
                                    value={tagQuery}
                                    onChange={(e) => setTagQuery(e.target.value)}
                                />
                                {searchingTags && (
                                    <div className="mt-1 text-sm text-slate-400 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                                    </div>
                                )}
                                {tagOptions.length > 0 && !tagId && (
                                    <div className={`mt-1 border rounded-lg max-h-40 overflow-y-auto shadow ${isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-200"}`}>
                                        {tagOptions.map((t) => (
                                            <button
                                                key={t.id}
                                                className={`w-full text-left p-2 text-sm ${isDarkMode ? "text-slate-200 hover:bg-white/10" : "text-slate-900 hover:bg-slate-50"}`}
                                                onClick={() => {
                                                    setTagId(t.id);
                                                    setSelectedTagCode(t.tag_code);
                                                    setTagQuery(t.tag_code);
                                                    setTagOptions([]);
                                                }}
                                            >
                                                {t.tag_code}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {tagId && (
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-sm text-emerald-600 font-medium">✓ {selectedTagCode}</span>
                                        <button
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                            onClick={clearTagSelection}
                                        >
                                            (clear)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Size Label */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Size</label>
                                <select
                                    className={`w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-200"}`}
                                    value={sizeLabel}
                                    onChange={(e) => setSizeLabel(e.target.value)}
                                >
                                    <option value='4"'>4"</option>
                                    <option value='6"'>6"</option>
                                    <option value='8"'>8"</option>
                                    <option value='10"'>10"</option>
                                    <option value='12"'>12"</option>
                                </select>
                            </div>

                            {/* Grade */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Grade</label>
                                <select
                                    className={`w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-200"}`}
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                </select>
                            </div>

                            {/* Qty */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    className={`w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? "bg-black border-white/10 text-white" : "bg-white border-slate-200"}`}
                                    value={qty}
                                    onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Notes (optional)</label>
                                <textarea
                                    className={`w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none resize-none ${isDarkMode ? "bg-black border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200"}`}
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </div>

                        {/* Error display */}
                        {addError && (
                            <div className="mx-4 mb-4 p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-700">
                                {addError}
                            </div>
                        )}

                        <div className={`p-4 border-t flex items-center justify-end gap-2 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
                            <button
                                className={`px-4 py-2 rounded-lg border text-sm ${isDarkMode ? "border-white/10 text-slate-300 hover:bg-white/10" : "border-slate-200 hover:bg-slate-100"}`}
                                onClick={closeAddModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60 hover:bg-slate-800 transition-colors"
                                onClick={onSubmitAdd}
                                disabled={!canAdd}
                            >
                                {working ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                                    </span>
                                ) : (
                                    "Add Item"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Dig Plan Modal */}
            <CreateDigPlanModal
                open={createPlanOpen}
                onClose={() => setCreatePlanOpen(false)}
                onSubmit={async (v) => {
                    setAddError(null);
                    const res = await createDigPlan({
                        zoneId,
                        status: v.status,
                        confidenceLevel: v.confidence_level,
                        planReason: v.plan_reason || null,
                        notes: v.notes || null,
                        targetDateFrom: v.target_date_from,
                        targetDateTo: v.target_date_to,
                    });
                    if (!res.ok) {
                        setAddError(res.message);
                        return;
                    }
                    setCreatePlanOpen(false);
                    await refetchPlans();
                }}
                isDarkMode={isDarkMode}
            />
        </div>
    );
}
