// src/components/zones/tabs/ZoneInspectionTabNew.tsx
import React from "react";

type Props = {
    zoneId: string;
    zone?: any;
    onReload?: () => void;
};

export function ZoneInspectionTabNew({ zoneId, zone, onReload }: Props) {
    return (
        <div className="space-y-6">
            <div className="text-slate-500 text-sm">
                [Placeholder] ZoneInspectionTabNew - zoneId: {zoneId}
            </div>
        </div>
    );
}

export default ZoneInspectionTabNew;
