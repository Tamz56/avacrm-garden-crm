import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { Loader2, Package } from "lucide-react";

type DealItemsTableProps = {
    dealId: string;
};

export const DealItemsTable: React.FC<DealItemsTableProps> = ({ dealId }) => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch deal items with product details
                const { data, error } = await supabase
                    .from("deal_items")
                    .select(`
                        id,
                        product_name,
                        quantity,
                        unit_price,
                        total_price,
                        notes
                    `)
                    .eq("deal_id", dealId)
                    .order("created_at", { ascending: true });

                if (error) throw error;
                setItems(data || []);
            } catch (err: any) {
                console.error("Error fetching deal items:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (dealId) {
            fetchItems();
        }
    }, [dealId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังโหลดรายการสินค้า...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                ไม่สามารถโหลดรายการสินค้าได้: {error}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                ไม่มีรายการสินค้าในดีลนี้
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Package className="h-4 w-4 text-slate-500" />
                    รายการสินค้า ({items.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-2">สินค้า</th>
                            <th className="px-4 py-2 text-right">จำนวน</th>
                            <th className="px-4 py-2 text-right">ราคาต่อหน่วย</th>
                            <th className="px-4 py-2 text-right">รวม</th>
                            <th className="px-4 py-2">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-900">
                                    {item.product_name}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {item.quantity.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    ฿{item.unit_price.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-emerald-600">
                                    ฿{item.total_price.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-500">
                                    {item.notes || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
