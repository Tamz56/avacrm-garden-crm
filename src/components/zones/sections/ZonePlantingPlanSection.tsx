// src/components/zones/sections/ZonePlantingPlanSection.tsx
import React from "react";

type Props = {
    zoneId: string;
    onReload?: () => void;
};

export function ZonePlantingPlanSection({ zoneId, onReload }: Props) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
                กำหนดจำนวนต้นไม้ในแปลง (ระบบ)
            </h3>
            <div className="text-slate-500 text-xs">
                [Placeholder] จะย้าย accordion table มาไว้ที่นี่ - zoneId: {zoneId}
            </div>
        </section>
    );
}

export default ZonePlantingPlanSection;
