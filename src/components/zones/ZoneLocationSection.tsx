import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { parseLatLngFromGoogleMaps, openInGoogleMaps } from "../../utils/maps";
import { useZoneMutations } from "../../hooks/useZoneMutations";
import ZoneBoundaryDrawModal from "./ZoneBoundaryDrawModal";

interface ZoneLocationSectionProps {
    zone: any;
    onSaved?: () => void;
    onReload?: () => void;
}

export const ZoneLocationSection: React.FC<ZoneLocationSectionProps> = ({
    zone,
    onSaved,
    onReload,
}) => {
    const { updateZoneLocation } = useZoneMutations();
    const [isBoundaryOpen, setIsBoundaryOpen] = React.useState(false);

    // Fallback compatibility: zone_lat ?? lat, zone_lng ?? lng, zone_map_url ?? map_url
    const getZoneLat = () => zone?.zone_lat ?? zone?.lat;
    const getZoneLng = () => zone?.zone_lng ?? zone?.lng;
    const getZoneMapUrl = () => zone?.zone_map_url ?? zone?.map_url ?? "";

    // Boundary and area data
    const hasBoundary = !!zone?.zone_boundary_geojson;
    const areaRai =
        zone?.area_rai != null && !Number.isNaN(Number(zone.area_rai))
            ? Number(zone.area_rai)
            : null;

    const latNum = getZoneLat();
    const lngNum = getZoneLng();
    const initialCenter =
        latNum != null && lngNum != null ? { lat: Number(latNum), lng: Number(lngNum) } : null;
    const initialBoundary = zone?.zone_boundary_geojson ?? null;

    const [mapUrl, setMapUrl] = React.useState<string>(getZoneMapUrl());
    const [lat, setLat] = React.useState<string>(getZoneLat()?.toString?.() ?? "");
    const [lng, setLng] = React.useState<string>(getZoneLng()?.toString?.() ?? "");
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);

    // Reset when zone changes
    React.useEffect(() => {
        setMapUrl(getZoneMapUrl());
        setLat(getZoneLat()?.toString?.() ?? "");
        setLng(getZoneLng()?.toString?.() ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zone?.id, zone?.zone_map_url, zone?.zone_lat, zone?.zone_lng, zone?.lat, zone?.lng, zone?.map_url]);

    const onMapUrlChange = (v: string) => {
        setMapUrl(v);
        const coords = parseLatLngFromGoogleMaps(v);
        if (coords) {
            setLat(String(coords.lat));
            setLng(String(coords.lng));
        }
    };

    const [latError, setLatError] = React.useState<string | null>(null);
    const [lngError, setLngError] = React.useState<string | null>(null);

    const validateCoords = (): boolean => {
        let valid = true;
        setLatError(null);
        setLngError(null);

        if (lat) {
            const latNum = Number(lat);
            if (isNaN(latNum) || latNum < -90 || latNum > 90) {
                setLatError("Lat ต้องอยู่ระหว่าง -90 ถึง 90");
                valid = false;
            }
        }
        if (lng) {
            const lngNum = Number(lng);
            if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
                setLngError("Lng ต้องอยู่ระหว่าง -180 ถึง 180");
                valid = false;
            }
        }
        return valid;
    };

    const save = async () => {
        if (!zone?.id) return;
        if (!validateCoords()) return;

        setSaving(true);
        setMessage(null);
        try {
            await updateZoneLocation(
                zone.id,
                lat ? Number(lat) : null,
                lng ? Number(lng) : null,
                mapUrl || null
            );
            setMessage("บันทึกพิกัดแปลงเรียบร้อยแล้ว ✅");
            onSaved?.();
        } catch (err: any) {
            setMessage("บันทึกพิกัดไม่สำเร็จ: " + (err.message || err));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const mapSrc = React.useMemo(() => {
        const la = lat !== null && lat !== undefined && lat !== "" ? Number(lat) : null;
        const lo = lng !== null && lng !== undefined && lng !== "" ? Number(lng) : null;
        if (Number.isFinite(la) && Number.isFinite(lo)) {
            return `https://www.google.com/maps?q=${la},${lo}&z=17&output=embed`;
        }
        return null;
    }, [lat, lng]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800">พิกัดแปลง (Zone Location)</div>

                    {hasBoundary ? (
                        <span className="ml-2 text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-200">
                            มีขอบเขตแล้ว
                        </span>
                    ) : (
                        <span className="ml-2 text-xs rounded-full bg-slate-50 text-slate-600 px-2 py-1 border">
                            ยังไม่มีขอบเขต
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setIsBoundaryOpen(true)}
                    className="rounded-xl bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-60"
                    disabled={!zone?.id}
                >
                    {hasBoundary ? "แก้ไขขอบเขต" : "วาดขอบเขต"}
                </button>
            </div>

            {/* พื้นที่ (ไร่) */}
            <div className="flex items-center justify-between text-xs text-slate-600">
                <div>
                    พื้นที่:{" "}
                    {areaRai == null ? (
                        <span className="text-slate-400">-</span>
                    ) : (
                        <span className="font-semibold text-slate-800">{areaRai.toFixed(2)} ไร่</span>
                    )}
                </div>
                {zone?.boundary_updated_at ? (
                    <div className="text-slate-400">อัปเดตขอบเขต: {new Date(zone.boundary_updated_at).toLocaleString()}</div>
                ) : null}
            </div>

            {mapSrc && (
                <div className="mb-2">
                    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <div className="h-72">
                            <iframe
                                title="Zone Map"
                                src={mapSrc}
                                className="w-full h-full"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                </div>
            )}

            <details className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100/50 select-none">
                    <span>แก้ไขพิกัด / ลิงก์แผนที่</span>
                    <span className="text-xs font-normal text-slate-400 group-open:hidden">(คลิกเพื่อเปิด)</span>
                    <span className="text-xs font-normal text-slate-400 hidden group-open:inline">(คลิกเพื่อปิด)</span>
                </summary>

                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white rounded-b-xl space-y-3">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">Google Maps URL</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                value={mapUrl}
                                onChange={(e) => onMapUrlChange(e.target.value)}
                                placeholder="วาง URL จาก Google Maps เพื่อดึงพิกัดอัตโนมัติ"
                            />
                            {mapUrl && (
                                <button
                                    type="button"
                                    onClick={() => openInGoogleMaps(mapUrl)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    เปิด
                                </button>
                            )}
                        </div>
                        {/* Warning for short links */}
                        {mapUrl && mapUrl.includes("maps.app.goo.gl") ? (
                            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                ⚠️ ลิงก์สั้นดึงพิกัดไม่ได้ กรุณาเปิดแล้วคัดลอกลิงก์เต็มที่มี @lat,lng
                            </p>
                        ) : (
                            <p className="text-[10px] text-slate-400">
                                วาง URL แล้วระบบจะดึง Lat/Lng อัตโนมัติ
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-500 ${latError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                                value={lat}
                                onChange={(e) => { setLat(e.target.value); setLatError(null); }}
                                placeholder="เช่น 14.1234567"
                            />
                            {latError && <p className="text-[10px] text-red-500">{latError}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-sky-500 ${lngError ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                                value={lng}
                                onChange={(e) => { setLng(e.target.value); setLngError(null); }}
                                placeholder="เช่น 101.1234567"
                            />
                            {lngError && <p className="text-[10px] text-red-500">{lngError}</p>}
                        </div>
                    </div>

                    {/* Generate URL from lat/lng */}
                    {lat && lng && !mapUrl && (
                        <button
                            type="button"
                            onClick={() => setMapUrl(`https://www.google.com/maps?q=${lat},${lng}`)}
                            className="text-xs text-sky-600 hover:text-sky-700 underline"
                        >
                            🔗 สร้างลิงก์จากพิกัด
                        </button>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-2">
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกพิกัด"}
                        </button>
                    </div>
                    {message && (
                        <div className={`text-center text-xs ${message.includes("✅") ? "text-emerald-600" : "text-red-500"}`}>
                            {message}
                        </div>
                    )}
                </div>
            </details>

            <ZoneBoundaryDrawModal
                open={isBoundaryOpen}
                onClose={() => setIsBoundaryOpen(false)}
                zoneId={zone?.id}
                initialCenter={initialCenter}
                initialBoundary={initialBoundary}
                onSaved={() => {
                    onSaved?.();
                    onReload?.();
                }}
            />
        </div>
    );
};

export default ZoneLocationSection;
