import React, { useState, useEffect } from "react";
import { Loader2, X, Edit, Save } from "lucide-react";
import { supabase } from "../../supabaseClient";
import DealFormBody, { DealItem, TeamShare } from "./DealFormBody";

interface EditDealModalProps {
    deal: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditDealModal: React.FC<EditDealModalProps> = ({
    deal,
    onClose,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [customers, setCustomers] = useState<any[]>([]);
    const [salesPeople, setSalesPeople] = useState<any[]>([]);

    // State for DealFormBody
    const [dealData, setDealData] = useState({
        name: "",
        customer_id: null,
        amount: 0,
        deposit_amount: 0,
        shipping_cost: 0,
        expected_close_date: null,
        note: "",
    });

    const [items, setItems] = useState<DealItem[]>([]);

    const [teamShare, setTeamShare] = useState<TeamShare>({
        referral_id: null,
        sales_agent_id: null,
        team_leader_id: null,
    });

    // Load options (Customers & Sales)
    useEffect(() => {
        const fetchOptions = async () => {
            const [custRes, profilesRes] = await Promise.all([
                supabase.from("customers").select("id, name"),
                supabase.from("profiles").select("id, full_name"),
            ]);

            if (!custRes.error) setCustomers(custRes.data || []);
            if (!profilesRes.error) setSalesPeople(profilesRes.data || []);
        };
        fetchOptions();
    }, []);

    // Initialize form with deal data and fetch items
    useEffect(() => {
        if (deal) {
            // 1. Set Basic Data
            setDealData({
                name: deal.title || "",
                customer_id: deal.customer_id || null,
                amount: Number(deal.total_amount || 0),
                deposit_amount: Number(deal.deposit_amount || 0),
                shipping_cost: Number(deal.shipping_cost || 0),
                expected_close_date: deal.closing_date || null,
                note: deal.note_customer || "",
            });

            setTeamShare({
                referral_id: deal.referral_sales_id || null,
                sales_agent_id: deal.closing_sales_id || null,
                team_leader_id: deal.team_leader_id || null,
            });

            // Fetch full deal details + items
            const fetchDetails = async () => {
                const { data: fullDeal } = await supabase
                    .from("deals")
                    .select("*")
                    .eq("id", deal.id)
                    .single();

                if (fullDeal) {
                    setDealData({
                        name: fullDeal.title || "",
                        customer_id: fullDeal.customer_id || null,
                        amount: Number(fullDeal.total_amount || 0),
                        deposit_amount: Number(fullDeal.deposit_amount || 0),
                        shipping_cost: Number(fullDeal.shipping_cost || 0),
                        expected_close_date: fullDeal.closing_date || null,
                        note: fullDeal.note_customer || "",
                    });
                    setTeamShare({
                        referral_id: fullDeal.referral_sales_id || null,
                        sales_agent_id: fullDeal.closing_sales_id || null,
                        team_leader_id: fullDeal.team_leader_id || null,
                    });
                }

                const { data: dealItems } = await supabase
                    .from("deal_items")
                    .select("*")
                    .eq("deal_id", deal.id);

                if (dealItems) {
                    const mappedItems: DealItem[] = dealItems.map((item: any) => ({
                        id: item.id,
                        stock_group_id: item.stock_group_id, // ใช้ stock_group_id
                        stock_item_id: item.stock_item_id, // deprecated
                        description: item.description,
                        tree_name: item.description, // Fallback
                        size_label: "",
                        trunk_size_inch: item.trunk_size_inch,
                        quantity: item.quantity,
                        price_per_tree: item.unit_price,
                        // Map new fields
                        price_type: item.price_type || 'per_tree',
                        height_m: item.height_m,
                        price_per_meter: item.price_per_meter,
                    }));
                    setItems(mappedItems);
                }
            };

            fetchDetails();
        }
    }, [deal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const total = Number(dealData.amount || 0);
            const deposit = Number(dealData.deposit_amount || 0);
            const remaining = total - deposit;

            // 1. Update Deal
            const { error: updateError } = await supabase
                .from("deals")
                .update({
                    title: dealData.name,
                    customer_id: dealData.customer_id,
                    total_amount: total,
                    amount: total,
                    grand_total: total,
                    deposit_amount: deposit,
                    shipping_cost: Number(dealData.shipping_cost || 0),
                    remaining_amount: remaining,
                    closing_date: dealData.expected_close_date || null,
                    note_customer: dealData.note,
                    referral_sales_id: teamShare.referral_id || null,
                    closing_sales_id: teamShare.sales_agent_id || null,
                    team_leader_id: teamShare.team_leader_id || null,
                    owner_id:
                        teamShare.sales_agent_id ||
                        teamShare.team_leader_id ||
                        teamShare.referral_id ||
                        null,
                })
                .eq("id", deal.id);

            if (updateError) throw updateError;

            // 2. Sync Deal Items
            // First, delete existing items
            const { error: deleteError } = await supabase
                .from("deal_items")
                .delete()
                .eq("deal_id", deal.id);

            if (deleteError) throw deleteError;

            // Then insert new items
            if (items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    deal_id: deal.id,
                    stock_group_id: item.stock_group_id || null, // ใช้ stock_group_id แทน
                    stock_item_id: null, // deprecated - ไม่ใช้แล้ว
                    description: item.description || item.tree_name || "ไม่ระบุ",
                    quantity: item.quantity,
                    unit_price: item.price_per_tree,
                    trunk_size_inch: item.trunk_size_inch || null,
                    line_total: item.quantity * item.price_per_tree,
                    unit: "ต้น",
                    // New fields for Price per Meter
                    price_type: item.price_type || 'per_tree',
                    height_m: item.height_m || null,
                    price_per_meter: item.price_per_meter || null,
                }));

                const { error: insertError } = await supabase
                    .from("deal_items")
                    .insert(itemsToInsert);

                if (insertError) throw insertError;
            }

            // 3. Recalculate Commissions
            const { error: rpcError } = await supabase.rpc(
                "recalc_deal_commissions",
                { p_deal_id: deal.id }
            );

            if (rpcError) {
                console.warn("Recalc commission error:", rpcError);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Update deal error:", err);
            setError(err.message || "เกิดข้อผิดพลาดในการแก้ไขดีล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Edit className="w-5 h-5 text-emerald-600" />
                            แก้ไขรายละเอียดดีล
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            {deal.deal_code || "Deal"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 text-sm mb-6 flex items-start gap-2">
                                <span className="mt-0.5">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <DealFormBody
                            mode="edit"
                            dealData={dealData}
                            setDealData={setDealData}
                            items={items}
                            setItems={setItems}
                            teamShare={teamShare}
                            setTeamShare={setTeamShare}
                            customerOptions={customers}
                            salesOptions={salesPeople}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            บันทึกการแก้ไข
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
