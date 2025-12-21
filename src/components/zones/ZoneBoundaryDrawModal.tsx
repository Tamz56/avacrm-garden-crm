import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-draw";
import { supabase } from "../../supabaseClient";

type Props = {
    open: boolean;
    onClose: () => void;
    zoneId: string;
    initialCenter?: { lat: number; lng: number } | null;
    initialBoundary?: any | null; // GeoJSON
    onSaved?: () => void;
};

export default function ZoneBoundaryDrawModal({
    open,
    onClose,
    zoneId,
    initialCenter,
    initialBoundary,
    onSaved,
}: Props) {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const drawnLayerRef = useRef<L.FeatureGroup | null>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const center = useMemo(() => {
        const lat = initialCenter?.lat ?? 14.55;
        const lng = initialCenter?.lng ?? 101.28;
        return { lat, lng };
    }, [initialCenter]);

    useEffect(() => {
        if (!open) return;

        // init map once per open
        const div = mapDivRef.current;
        if (!div) return;

        // cleanup any previous instance
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            drawnLayerRef.current = null;
        }

        const map = L.map(div, { zoomControl: true }).setView([center.lat, center.lng], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        drawnItems.addTo(map);
        drawnLayerRef.current = drawnItems;

        // If have existing boundary, load it
        if (initialBoundary) {
            try {
                const layer = L.geoJSON(initialBoundary as any);
                layer.eachLayer((l) => drawnItems.addLayer(l));
                const bounds = layer.getBounds();
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
            } catch {
                // ignore malformed boundary
            }
        }

        const drawControl = new (L as any).Control.Draw({
            edit: { featureGroup: drawnItems, remove: true },
            draw: {
                polygon: true,
                polyline: false,
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
            },
        });
        map.addControl(drawControl);

        map.on((L as any).Draw.Event.CREATED, (e: any) => {
            // allow only one polygon: clear then add
            drawnItems.clearLayers();
            drawnItems.addLayer(e.layer);
        });

        mapRef.current = map;

        return () => {
            map.off();
            map.remove();
            mapRef.current = null;
            drawnLayerRef.current = null;
        };
    }, [open, center.lat, center.lng, initialBoundary]);

    if (!open) return null;

    async function handleSave() {
        setError(null);

        const fg = drawnLayerRef.current;
        if (!fg) return;

        const fc = fg.toGeoJSON() as any;

        const feature =
            fc?.type === "FeatureCollection" && Array.isArray(fc.features) && fc.features.length > 0
                ? fc.features[0]
                : null;

        const geomType = feature?.geometry?.type;
        const isPolygon = geomType === "Polygon" || geomType === "MultiPolygon";

        if (!feature || !isPolygon) {
            setError("ยังไม่มีขอบเขตแปลง (กรุณาวาด Polygon ก่อน)");
            return;
        }

        // Normalize: store only first polygon feature, strip props to keep stable
        const payload = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {},
                    geometry: feature.geometry,
                },
            ],
        };

        setSaving(true);
        try {
            const { error } = await supabase.rpc("update_stock_zone_boundary", {
                p_zone_id: zoneId,
                p_boundary_geojson: payload,
            });
            if (error) throw error;

            onSaved?.();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    }

    function handleFit() {
        const map = mapRef.current;
        const fg = drawnLayerRef.current;
        if (!map || !fg) return;

        const bounds = fg.getBounds?.();
        if (bounds && bounds.isValid && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        } else {
            map.setView([center.lat, center.lng], 16);
        }
    }

    async function handleClear() {
        setError(null);
        setSaving(true);
        try {
            const { error } = await supabase.rpc("update_stock_zone_boundary", {
                p_zone_id: zoneId,
                p_boundary_geojson: null,
            });
            if (error) throw error;

            onSaved?.();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? "ลบไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <div className="text-sm font-semibold text-slate-900">วาดขอบเขตแปลง (Zone Boundary)</div>
                    <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onClose}>
                        ปิด
                    </button>
                </div>

                <div className="p-4">
                    <div ref={mapDivRef} className="h-[520px] w-full rounded-2xl border bg-slate-50" />
                    {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                            onClick={handleFit}
                            disabled={saving}
                        >
                            ซูมให้พอดี
                        </button>
                        <button
                            className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                            onClick={handleClear}
                            disabled={saving}
                        >
                            ลบขอบเขต
                        </button>
                        <button
                            className="rounded-xl bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-60"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกขอบเขต"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
