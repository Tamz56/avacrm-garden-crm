// src/hooks/useTagStatusActions.ts
// Hook for managing tag status transitions with oversell prevention

import { supabase } from "../supabaseClient";

export type TagStatus =
    | "in_zone"
    | "selected_for_dig"
    | "root_prune_1"
    | "root_prune_2"
    | "root_prune_3"
    | "root_prune_4"
    | "ready_to_lift"
    | "reserved"
    | "dig_ordered"
    | "dug"
    | "shipped"
    | "planted"
    | "rehab"
    | "dead"
    | "cancelled";

export interface TagStatusResult {
    success: boolean;
    count: number;
    error?: string;
}

/**
 * Reserve tags for a deal: in_zone → reserved
 */
export async function reserveTagsForDeal(
    dealId: string,
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("reserve_tags_for_deal", {
        p_deal_id: dealId,
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("reserveTagsForDeal error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Unreserve tags (cancel reservation): reserved → in_zone
 */
export async function unreserveTags(
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("unreserve_tags", {
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("unreserveTags error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Set tags to dig_ordered: reserved/in_zone → dig_ordered
 */
export async function setTagsDigOrdered(
    digOrderId: string,
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("set_tags_dig_ordered", {
        p_dig_order_id: digOrderId,
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("setTagsDigOrdered error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Mark tags as dug: dig_ordered → dug
 */
export async function markTagsDug(
    digOrderId: string,
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("mark_tags_dug", {
        p_dig_order_id: digOrderId,
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("markTagsDug error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Mark tags as shipped: dug → shipped
 */
export async function markTagsShipped(
    shipmentId: string,
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("mark_tags_shipped", {
        p_shipment_id: shipmentId,
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("markTagsShipped error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Mark tags as planted: shipped → planted
 */
export async function markTagsPlanted(
    dealId: string,
    tagIds: string[]
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("mark_tags_planted", {
        p_deal_id: dealId,
        p_tag_ids: tagIds,
    });

    if (error) {
        console.error("markTagsPlanted error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Cancel tags: any → cancelled
 */
export async function cancelTags(
    tagIds: string[],
    reason?: string
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("cancel_tags", {
        p_tag_ids: tagIds,
        p_reason: reason || null,
    });

    if (error) {
        console.error("cancelTags error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

/**
 * Direct status change using central function
 */
export async function setTagStatus(
    tagIds: string[],
    newStatus: TagStatus,
    options?: {
        dealId?: string;
        digOrderId?: string;
        shipmentId?: string;
        source?: string;
    }
): Promise<TagStatusResult> {
    const { data, error } = await supabase.rpc("set_tree_tag_status", {
        p_tag_ids: tagIds,
        p_new_status: newStatus,
        p_source: options?.source || null,
        p_deal_id: options?.dealId || null,
        p_dig_order_id: options?.digOrderId || null,
        p_shipment_id: options?.shipmentId || null,
    });

    if (error) {
        console.error("setTagStatus error:", error);
        return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data as number };
}

// Status flow constants for display
export const TAG_STATUS_LABELS: Record<TagStatus, string> = {
    in_zone: "อยู่ในแปลง",
    selected_for_dig: "เลือกไว้จะขุด",
    root_prune_1: "ตัดราก 1",
    root_prune_2: "ตัดราก 2",
    root_prune_3: "ตัดราก 3",
    root_prune_4: "ตัดราก 4",
    ready_to_lift: "พร้อมยก/พร้อมขาย",
    reserved: "จองแล้ว",
    dig_ordered: "อยู่ในใบสั่งขุด",
    dug: "ขุดแล้ว",
    shipped: "ส่งมอบแล้ว",
    planted: "ปลูกให้ลูกค้าแล้ว",
    rehab: "พักฟื้น",
    dead: "ตาย",
    cancelled: "ยกเลิก",
};

export const TAG_STATUS_COLORS: Record<TagStatus, string> = {
    in_zone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    selected_for_dig: "bg-sky-50 text-sky-700 border-sky-200",
    root_prune_1: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_2: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_3: "bg-yellow-50 text-yellow-700 border-yellow-200",
    root_prune_4: "bg-yellow-50 text-yellow-700 border-yellow-200",
    ready_to_lift: "bg-lime-50 text-lime-700 border-lime-200",
    reserved: "bg-amber-50 text-amber-700 border-amber-200",
    dig_ordered: "bg-orange-50 text-orange-700 border-orange-200",
    dug: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    planted: "bg-green-50 text-green-700 border-green-200",
    rehab: "bg-pink-50 text-pink-700 border-pink-200",
    dead: "bg-slate-100 text-slate-700 border-slate-300",
    cancelled: "bg-red-50 text-red-700 border-red-200",
};
