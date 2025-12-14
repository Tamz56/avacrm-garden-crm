import React from "react";
import clsx from "clsx";

type Props = {
    status: string;
};

export const ZoneMismatchStatusBadge: React.FC<Props> = ({ status }) => {
    // map สีตามสถานะ
    const colorClass = (() => {
        if (status === "ยังไม่สำรวจ" || status === "ยังไม่ปลูก/บันทึก") {
            return "bg-gray-100 text-gray-700";
        }
        if (status === "ตรงตามระบบ") {
            return "bg-emerald-100 text-emerald-800";
        }
        if (status === "คลาดเคลื่อนเล็กน้อย") {
            return "bg-amber-50 text-amber-800";
        }
        if (status === "คลาดเคลื่อนปานกลาง") {
            return "bg-orange-50 text-orange-800";
        }
        // คลาดเคลื่อนมาก หรืออย่างอื่น
        return "bg-red-50 text-red-700";
    })();

    return (
        <span
            className={clsx(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
                colorClass
            )}
        >
            {status}
        </span>
    );
};
