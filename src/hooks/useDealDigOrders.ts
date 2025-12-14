// src/hooks/useDealDigOrders.ts
// @ts-nocheck ถ้ายังไม่ได้เซ็ต type เต็ม ๆ

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export type DealDigOrder = {
    id: string;
    deal_id: string;
    code: string;
    status: string;
    scheduled_date: string | null;
    notes: string | null;
    created_at: string;
    tags_count: number;
};

type UseDealDigOrdersResult = {
    orders: DealDigOrder[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    updateOrderStatus: (
        orderId: string,
        status: string,
        scheduledDate: string | null,
        notes: string | null
    ) => Promise<void>;
};

export function useDealDigOrders(dealId?: string | null): UseDealDigOrdersResult {
    const [orders, setOrders] = useState<DealDigOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (signal?: AbortSignal) => {
            if (!dealId) {
                setOrders([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const { data, error } = await supabase
                    .rpc("get_deal_dig_orders", { p_deal_id: dealId })
                    .abortSignal?.(signal as any);

                if (error) throw error;

                setOrders(data ?? []);
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                console.error("โหลด Dig Orders ไม่สำเร็จ:", err);
                setError(err.message ?? "โหลดคำสั่งขุดล้อมไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        },
        [dealId]
    );

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const refresh = useCallback(async () => {
        await load();
    }, [load]);

    const updateOrderStatus = useCallback(
        async (
            orderId: string,
            status: string,
            scheduledDate: string | null,
            notes: string | null
        ) => {
            try {
                setLoading(true);
                setError(null);

                const { data, error } = await supabase.rpc(
                    "update_dig_order_status",
                    {
                        p_order_id: orderId,
                        p_status: status,
                        p_scheduled_date: scheduledDate,
                        p_note: notes,
                    }
                );

                if (error) throw error;

                // อัปเดต state ฝั่งหน้าเว็บทันที
                setOrders((prev) =>
                    prev.map((o) => (o.id === orderId ? { ...o, ...data } : o))
                );
            } catch (err: any) {
                console.error("อัปเดตสถานะคำสั่งขุดไม่สำเร็จ:", err);
                setError(err.message ?? "อัปเดตสถานะคำสั่งขุดไม่สำเร็จ");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return { orders, loading, error, refresh, updateOrderStatus };
}
