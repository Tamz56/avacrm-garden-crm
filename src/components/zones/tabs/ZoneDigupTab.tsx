// src/components/zones/tabs/ZoneDigupTab.tsx
import React from "react";

type Props = {
    zoneId: string;
    zone?: any;
    onReload?: () => void;
};

export function ZoneDigupTab({ zoneId, zone, onReload }: Props) {
    return (
        <div className="space-y-6">
            <div className="text-slate-500 text-sm">
                [Placeholder] ZoneDigupTab - zoneId: {zoneId}
            </div>
        </div>
    );
}

export default ZoneDigupTab;
