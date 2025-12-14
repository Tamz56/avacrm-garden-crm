import React from 'react';

export type TagStatus =
    | "in_zone"
    | "available"
    | "reserved"
    | "dig_ordered"
    | "dug"
    | "shipped"
    | "planted"
    | "dead"
    | "waste";

export const STATUS_BADGE_LABEL: Record<string, string> = {
    in_zone: "In zone",
    available: "พร้อมขาย",
    reserved: "จองแล้ว",
    dig_ordered: "Dig ordered",
    dug: "ขุดแล้ว",
    shipped: "ส่งออกแล้ว",
    planted: "ปลูกแล้ว",
    dead: "ตาย",
    waste: "คัดทิ้ง",
};

export const STATUS_BADGE_COLOR: Record<string, string> = {
    in_zone: "bg-slate-100 text-slate-700",
    available: "bg-emerald-50 text-emerald-700",
    reserved: "bg-amber-50 text-amber-700",
    dig_ordered: "bg-orange-50 text-orange-700",
    dug: "bg-sky-50 text-sky-700",
    shipped: "bg-indigo-50 text-indigo-700",
    planted: "bg-green-50 text-green-700",
    dead: "bg-rose-50 text-rose-700",
    waste: "bg-zinc-100 text-zinc-700",
};

export const TagStatusBadge = ({ status }: { status: string }) => {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_COLOR[status] || 'bg-slate-100 text-slate-700'}`}
        >
            {STATUS_BADGE_LABEL[status] || status}
        </span>
    );
};
