// src/lib/commissionApi.ts
import { supabase } from "../supabaseClient"; // แก้ path ให้ตรงของโปรเจกต์คุณ

export async function payCommissionApi({
    commissionId,
    amount,
    paidAt,
    method,
    note,
    currentProfileId,
}: {
    commissionId: string;
    amount: number;
    paidAt?: string; // 'YYYY-MM-DD'
    method: "transfer" | "cash" | "other" | string;
    note?: string;
    currentProfileId: string;
}) {
    const { data, error } = await supabase.rpc("pay_commission", {
        p_deal_commission_id: commissionId,
        p_amount: amount,
        p_paid_at: paidAt ?? null,
        p_method: method,
        p_note: note ?? null,
        p_created_by: currentProfileId,
    });

    if (error) {
        console.error("pay_commission error", error);
        throw error;
    }

    return data; // deal_commissions แถวที่อัปเดตแล้ว
}
