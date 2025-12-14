import React, { useMemo } from "react";
import { useDealStockShippedSummary } from "../hooks/useDealStockShippedSummary";
import { Package, AlertCircle } from "lucide-react";

export interface DealStockAllocation {
    deal_id: string;
    deal_item_id: string;
    stock_item_id: string;
    ordered_quantity: number;
    shipped_quantity: number; // This might be from the view, but we override/augment with hook
    remaining_quantity: number;
    // Extra metadata
    stock_item_code?: string;
    stock_item_size?: string;
    stock_item_zone?: string;
    zone_id?: string;
    // Computed for display
    label?: string;
}

interface DealStockSummaryCardProps {
    dealId: string;
    allocations: DealStockAllocation[];
}

const DealStockSummaryCard: React.FC<DealStockSummaryCardProps> = ({
    dealId,
    allocations,
}) => {
    const { data: shippedRows, loading, error } = useDealStockShippedSummary(dealId);

    const rows = useMemo(() => {
        const shippedMap = new Map<string, number>();
        shippedRows.forEach((r) => {
            shippedMap.set(r.stock_item_id, Number(r.total_shipped || 0));
        });

        return allocations.map((a) => {
            const shipped = shippedMap.get(a.stock_item_id) || 0;
            // remaining in deal = ordered - shipped
            const remainingAfterShip = Math.max(a.ordered_quantity - shipped, 0);

            return {
                ...a,
                shipped, // Override/Set shipped from movement
                remainingAfterShip,
            };
        });
    }, [allocations, shippedRows]);

    const totalOrdered = rows.reduce((sum, r) => sum + (r.ordered_quantity || 0), 0);
    const totalShipped = rows.reduce((sum, r) => sum + r.shipped, 0);
    const totalRemaining = rows.reduce((sum, r) => sum + r.remainingAfterShip, 0);

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">
                            สรุปสต็อกของดีลนี้
                        </h3>
                        <p className="text-xs text-slate-500">
                            (ดึงจากจำนวนในดีล และรายการจัดส่งที่ผูกกับดีล)
                        </p>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="py-6 text-center text-sm text-slate-500">
                    กำลังโหลดข้อมูลการจัดส่ง...
                </div>
            )}

            {!loading && error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && rows.length === 0 && (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    ยังไม่มีรายการต้นไม้ในดีลนี้
                </div>
            )}

            {!loading && !error && rows.length > 0 && (
                <>
                    {/* summary bar */}
                    <div className="mb-3 grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <div className="text-slate-500">จำนวนในดีลรวม</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">
                                {totalOrdered.toLocaleString()} ต้น
                            </div>
                        </div>
                        <div className="rounded-lg bg-blue-50 p-3">
                            <div className="text-blue-700">ส่งแล้ว</div>
                            <div className="mt-1 text-lg font-semibold text-blue-900">
                                {totalShipped.toLocaleString()} ต้น
                            </div>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3">
                            <div className="text-amber-700">คงเหลือในดีล</div>
                            <div className="mt-1 text-lg font-semibold text-amber-900">
                                {totalRemaining.toLocaleString()} ต้น
                            </div>
                        </div>
                    </div>

                    {/* detail rows */}
                    <div className="overflow-hidden rounded-xl border border-slate-100 text-xs">
                        <div className="grid grid-cols-4 bg-slate-50 px-3 py-2 font-medium text-slate-600">
                            <div>ต้นไม้ / โซน</div>
                            <div className="text-right">จำนวนในดีล</div>
                            <div className="text-right">ส่งแล้ว</div>
                            <div className="text-right">คงเหลือในดีล</div>
                        </div>
                        {rows.map((r) => (
                            <div
                                key={r.deal_item_id}
                                className="grid grid-cols-4 border-t border-slate-100 px-3 py-2"
                            >
                                <div className="pr-2 text-slate-800">
                                    <div className="font-medium">{r.label || r.stock_item_code || "Unknown"}</div>
                                    <div className="text-[10px] text-slate-500">
                                        {r.stock_item_size} {r.stock_item_zone ? `· ${r.stock_item_zone}` : ""}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {r.ordered_quantity.toLocaleString()}
                                </div>
                                <div className="text-right text-blue-700 font-medium">
                                    {r.shipped.toLocaleString()}
                                </div>
                                <div className="text-right text-amber-700 font-medium">
                                    {r.remainingAfterShip.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DealStockSummaryCard;
