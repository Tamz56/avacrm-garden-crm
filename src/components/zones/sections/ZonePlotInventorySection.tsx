// src/components/zones/sections/ZonePlotInventorySection.tsx
import React from "react";

type Props = {
    zoneId: string;
    onReload?: () => void;
};

export function ZonePlotInventorySection({ zoneId, onReload }: Props) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
                Plot Inventory (รายการต้นไม้ในแปลง)
            </h3>
            <div className="text-slate-500 text-xs">
                [Placeholder] จะย้ายตาราง plot inventory มาไว้ที่นี่ - zoneId: {zoneId}
            </div>
        </section>
    );
}

export default ZonePlotInventorySection;
