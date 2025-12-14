import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { X, Truck, MapPin, ExternalLink } from "lucide-react";
import { parseLatLngFromGoogleMaps, openInGoogleMaps } from "../../utils/maps";

const VEHICLE_OPTIONS = [
    { code: "pickup", name: "กระบะ" },
    { code: "truck6", name: "รถบรรทุก 6 ล้อ" },
    { code: "truck10_crane", name: "รถบรรทุก 10 ล้อ + เครน" },
];

interface NewShipmentModalProps {
    dealId: string;
    defaultShipDate?: string; // YYYY-MM-DD
    onClose: () => void;
    onCreated?: () => void;
}

const NewShipmentModal: React.FC<NewShipmentModalProps> = ({
    dealId,
    defaultShipDate,
    onClose,
    onCreated,
}) => {
    const [shipDate, setShipDate] = useState<string>(
        defaultShipDate || new Date().toISOString().slice(0, 10)
    );
    const [transporterName, setTransporterName] = useState<string>("");
    const [trackingCode, setTrackingCode] = useState<string>("");
    const [vehicleCode, setVehicleCode] = useState<string>("pickup");
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [note, setNote] = useState<string>("");

    // Dropoff location fields
    const [dropoffAddress, setDropoffAddress] = useState<string>("");
    const [dropoffMapUrl, setDropoffMapUrl] = useState<string>("");
    const [dropoffLat, setDropoffLat] = useState<number | null>(null);
    const [dropoffLng, setDropoffLng] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Auto-parse lat/lng when map URL changes
    useEffect(() => {
        if (dropoffMapUrl) {
            const parsed = parseLatLngFromGoogleMaps(dropoffMapUrl);
            if (parsed) {
                setDropoffLat(parsed.lat);
                setDropoffLng(parsed.lng);
            }
        }
    }, [dropoffMapUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!shipDate) {
            setErrorMsg("กรุณาเลือกวันที่จัดส่ง");
            return;
        }

        // อย่างน้อยควรมีระยะทางหรือราคาขนส่งสัก 1 ช่อง
        if (!distanceKm && !estimatedPrice) {
            setErrorMsg("กรุณากรอกระยะทาง (กม.) หรือค่าขนส่งอย่างน้อย 1 ช่อง");
            return;
        }

        setLoading(true);

        const vehicle = VEHICLE_OPTIONS.find((v) => v.code === vehicleCode);

        // Insert shipment first
        const { data: insertedData, error } = await supabase
            .from("deal_shipments")
            .insert([
                {
                    deal_id: dealId,
                    ship_date: shipDate,
                    transporter_name: transporterName || null,
                    tracking_code: trackingCode || null,
                    distance_km: distanceKm ?? null,
                    estimated_price: estimatedPrice ?? null,
                    final_price: estimatedPrice ?? null,
                    vehicle_type_id: null,
                    vehicle_code: vehicle?.code ?? null,
                    vehicle_name: vehicle?.name ?? null,
                    note: note || null,
                    status: 'draft',
                },
            ])
            .select("id")
            .single();

        if (error || !insertedData) {
            console.error("create shipment error:", error);
            setErrorMsg(error?.message ?? "ไม่สามารถสร้างการจัดส่งได้");
            setLoading(false);
            return;
        }

        // Call RPC to update dropoff location if any dropoff data provided
        if (dropoffAddress || dropoffMapUrl || dropoffLat || dropoffLng) {
            const { error: rpcError } = await supabase.rpc("update_deal_shipment_dropoff", {
                p_shipment_id: insertedData.id,
                p_address: dropoffAddress || null,
                p_lat: dropoffLat ?? null,
                p_lng: dropoffLng ?? null,
                p_map_url: dropoffMapUrl || null,
                p_delivered_at: null,
            });

            if (rpcError) {
                console.error("update dropoff error:", rpcError);
                // Non-fatal, continue
            }
        }

        setLoading(false);

        onCreated?.();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                เพิ่มการจัดส่งใหม่
                            </div>
                            <div className="text-xs text-slate-500">
                                ระบุวันที่จัดส่ง ประเภทรถ ระยะทาง และราคาจริงที่ตกลงกับขนส่ง
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                วันที่จัดส่ง
                            </label>
                            <input
                                type="date"
                                value={shipDate}
                                onChange={(e) => setShipDate(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                ผู้ขนส่ง / บริษัทขนส่ง
                            </label>
                            <input
                                type="text"
                                value={transporterName}
                                onChange={(e) => setTransporterName(e.target.value)}
                                placeholder="เช่น ทีมขนส่ง Ava Farm / บริษัทขนส่ง A"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                ประเภทรถขนส่ง
                            </label>
                            <select
                                value={vehicleCode}
                                onChange={(e) => setVehicleCode(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                            >
                                {VEHICLE_OPTIONS.map((v) => (
                                    <option key={v.code} value={v.code}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                ระยะทาง (กม.)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={distanceKm ?? ""}
                                onChange={(e) =>
                                    setDistanceKm(
                                        e.target.value === "" ? null : Number(e.target.value)
                                    )
                                }
                                placeholder="เช่น 95"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                ค่าขนส่ง (ราคาจริงที่ตกลง) ฿
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={estimatedPrice ?? ""}
                                onChange={(e) =>
                                    setEstimatedPrice(
                                        e.target.value === "" ? null : Number(e.target.value)
                                    )
                                }
                                placeholder="เช่น 3,800"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                กรอกราคาที่บริษัทขนส่งเสนอจริง ไม่ใช้สูตรคำนวณจากระบบ
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                Tracking / เลขอ้างอิง (ถ้ามี)
                            </label>
                            <input
                                type="text"
                                value={trackingCode}
                                onChange={(e) => setTrackingCode(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Dropoff Location Section */}
                    <div className="border-t border-slate-100 pt-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-sky-600" />
                            <span className="text-xs font-medium text-slate-700">จุดลงต้น (Dropoff Location)</span>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    ที่อยู่จุดลงต้น
                                </label>
                                <input
                                    type="text"
                                    value={dropoffAddress}
                                    onChange={(e) => setDropoffAddress(e.target.value)}
                                    placeholder="เช่น 123 ถ.สุขุมวิท แขวงคลองตัน เขตคลองเตย กทม. 10110"
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Google Maps URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={dropoffMapUrl}
                                        onChange={(e) => setDropoffMapUrl(e.target.value)}
                                        placeholder="วาง URL จาก Google Maps เพื่อดึงพิกัดอัตโนมัติ"
                                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                    />
                                    {dropoffMapUrl && (
                                        <button
                                            type="button"
                                            onClick={() => openInGoogleMaps(dropoffMapUrl)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            เปิด
                                        </button>
                                    )}
                                </div>
                                {/* Short link warning */}
                                {dropoffMapUrl && dropoffMapUrl.includes("maps.app.goo.gl") ? (
                                    <p className="mt-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                                        ⚠️ ลิงก์สั้นดึงพิกัดไม่ได้ กรุณาเปิดแล้วคัดลอกลิงก์เต็มที่มี @lat,lng
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        วาง URL แล้วระบบจะดึง Lat/Lng อัตโนมัติ
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Latitude
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={dropoffLat ?? ""}
                                        onChange={(e) => setDropoffLat(e.target.value ? Number(e.target.value) : null)}
                                        placeholder="เช่น 13.7563"
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Longitude
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={dropoffLng ?? ""}
                                        onChange={(e) => setDropoffLng(e.target.value ? Number(e.target.value) : null)}
                                        placeholder="เช่น 100.5018"
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            {/* Generate URL from lat/lng */}
                            {dropoffLat && dropoffLng && !dropoffMapUrl && (
                                <button
                                    type="button"
                                    onClick={() => setDropoffMapUrl(`https://www.google.com/maps?q=${dropoffLat},${dropoffLng}`)}
                                    className="text-xs text-sky-600 hover:text-sky-700 underline"
                                >
                                    🔗 สร้างลิงก์จากพิกัด
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            หมายเหตุ
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="รายละเอียดเพิ่มเติม เช่น เวลาโหลดลง จุดลงต้น ระวังสายไฟ ฯลฯ"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {errorMsg && (
                        <div className="text-xs text-red-500 mt-1">{errorMsg}</div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {loading ? "กำลังบันทึก..." : "บันทึกการจัดส่ง"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewShipmentModal;

