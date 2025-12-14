import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { parseLatLngFromGoogleMaps, openInGoogleMaps } from "../../utils/maps";
import { useZoneMutations } from "../../hooks/useZoneMutations";

interface ZoneLocationSectionProps {
    zone: any;
    onSaved?: () => void;
}

export const ZoneLocationSection: React.FC<ZoneLocationSectionProps> = ({
    zone,
    onSaved,
}) => {
    const { updateZoneLocation } = useZoneMutations();

    const [mapUrl, setMapUrl] = React.useState<string>(zone?.zone_map_url ?? "");
    const [lat, setLat] = React.useState<string>(zone?.zone_lat?.toString?.() ?? "");
    const [lng, setLng] = React.useState<string>(zone?.zone_lng?.toString?.() ?? "");
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);

    // Reset when zone changes
    React.useEffect(() => {
        setMapUrl(zone?.zone_map_url ?? "");
        setLat(zone?.zone_lat?.toString?.() ?? "");
        setLng(zone?.zone_lng?.toString?.() ?? "");
    }, [zone?.id, zone?.zone_map_url, zone?.zone_lat, zone?.zone_lng]);

    const onMapUrlChange = (v: string) => {
        setMapUrl(v);
        const coords = parseLatLngFromGoogleMaps(v);
        if (coords) {
            setLat(String(coords.lat));
            setLng(String(coords.lng));
        }
    };

    const save = async () => {
        if (!zone?.id) return;
        setSaving(true);
        setMessage(null);
        try {
            await updateZoneLocation(
                zone.id,
                lat ? Number(lat) : null,
                lng ? Number(lng) : null,
                mapUrl || null,
                null
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
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-sky-600" />
                </div>
                <div className="text-sm font-semibold text-slate-800">พิกัดแปลง (Zone Location)</div>
            </div>

            {mapSrc && (
                <div className="mb-2">
                    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <div className="h-56">
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
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                placeholder="เช่น 14.1234567"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                                value={lng}
                                onChange={(e) => setLng(e.target.value)}
                                placeholder="เช่น 101.1234567"
                            />
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
        </div>
    );
};

export default ZoneLocationSection;
