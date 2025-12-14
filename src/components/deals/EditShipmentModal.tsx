import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Truck, CheckCircle2, XCircle, Loader2, MapPin, ExternalLink, PackageCheck } from 'lucide-react';
import type { ShipmentStatus } from '../../types/shipment';
import { SHIPMENT_STATUS_LABELS } from '../../types/shipment';
import { updateShipmentStatus } from '../../lib/shipments';
import { parseLatLngFromGoogleMaps, openInGoogleMaps } from '../../utils/maps';

const VEHICLE_OPTIONS = [
    { code: "pickup", name: "กระบะ" },
    { code: "truck6", name: "รถบรรทุก 6 ล้อ" },
    { code: "truck10_crane", name: "รถบรรทุก 10 ล้อ + เครน" },
];

interface EditShipmentModalProps {
    shipment: any;
    onClose: () => void;
    onUpdated: () => void;
}

const EditShipmentModal: React.FC<EditShipmentModalProps> = ({
    shipment,
    onClose,
    onUpdated,
}) => {
    const [shipDate, setShipDate] = useState<string>("");
    const [transporterName, setTransporterName] = useState<string>("");
    const [trackingCode, setTrackingCode] = useState<string>("");
    const [vehicleCode, setVehicleCode] = useState<string>("pickup");
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [note, setNote] = useState<string>("");
    const [status, setStatus] = useState<ShipmentStatus>('draft');

    const [loading, setLoading] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<ShipmentStatus | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Dropoff location state
    const [dropoffAddress, setDropoffAddress] = useState<string>("");
    const [dropoffMapUrl, setDropoffMapUrl] = useState<string>("");
    const [dropoffLat, setDropoffLat] = useState<number | null>(null);
    const [dropoffLng, setDropoffLng] = useState<number | null>(null);
    const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
    const [markingDelivered, setMarkingDelivered] = useState(false);

    useEffect(() => {
        if (shipment) {
            setShipDate(shipment.ship_date || "");
            setTransporterName(shipment.transporter_name || "");
            setTrackingCode(shipment.tracking_code || "");
            setVehicleCode(shipment.vehicle_code || "pickup");
            setDistanceKm(shipment.distance_km);
            setEstimatedPrice(shipment.estimated_price || shipment.final_price);
            setNote(shipment.note || "");
            setStatus(shipment.status || 'draft');
            // Dropoff fields
            setDropoffAddress(shipment.dropoff_address || "");
            setDropoffMapUrl(shipment.dropoff_map_url || "");
            setDropoffLat(shipment.dropoff_lat ?? null);
            setDropoffLng(shipment.dropoff_lng ?? null);
            setDeliveredAt(shipment.delivered_at || null);
        }
    }, [shipment]);

    // Auto-parse lat/lng from map URL
    useEffect(() => {
        if (dropoffMapUrl) {
            const coords = parseLatLngFromGoogleMaps(dropoffMapUrl);
            if (coords) {
                setDropoffLat(coords.lat);
                setDropoffLng(coords.lng);
            }
        }
    }, [dropoffMapUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        const vehicle = VEHICLE_OPTIONS.find((v) => v.code === vehicleCode);

        const { error } = await supabase
            .from("deal_shipments")
            .update({
                ship_date: shipDate,
                transporter_name: transporterName || null,
                tracking_code: trackingCode || null,
                distance_km: distanceKm ?? null,
                estimated_price: estimatedPrice ?? null,
                final_price: estimatedPrice ?? null,
                vehicle_code: vehicle?.code ?? null,
                vehicle_name: vehicle?.name ?? null,
                note: note || null,
            })
            .eq('id', shipment.id);

        setLoading(false);

        if (error) {
            console.error("update shipment error:", error);
            setErrorMsg(error.message);
            return;
        }

        onUpdated();
        onClose();
    };

    const handleChangeStatus = async (nextStatus: ShipmentStatus) => {
        const confirmText =
            nextStatus === 'completed'
                ? 'ยืนยันปิดงานขนส่งนี้ว่า "ส่งครบแล้ว"?'
                : 'ยืนยันยกเลิกงานขนส่งนี้?';

        if (!window.confirm(confirmText)) return;

        try {
            setErrorMsg(null);
            setUpdatingStatus(nextStatus);
            const updated = await updateShipmentStatus(shipment.id, nextStatus);
            setStatus(updated.status as ShipmentStatus);
            onUpdated();
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'เปลี่ยนสถานะไม่สำเร็จ');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';

    const handleMarkDelivered = async () => {
        if (!shipment?.id) return;
        if (!window.confirm('ยืนยันว่าส่งมอบต้นไม้ถึงลูกค้าแล้ว?')) return;

        setMarkingDelivered(true);
        setErrorMsg(null);
        try {
            const { error } = await supabase.rpc('update_deal_shipment_dropoff', {
                p_shipment_id: shipment.id,
                p_address: dropoffAddress || null,
                p_lat: dropoffLat ?? null,
                p_lng: dropoffLng ?? null,
                p_map_url: dropoffMapUrl || null,
                p_delivered_at: new Date().toISOString()
            });

            if (error) throw error;
            setDeliveredAt(new Date().toISOString());
            onUpdated();
        } catch (err: any) {
            setErrorMsg(err.message || 'บันทึกไม่สำเร็จ');
        } finally {
            setMarkingDelivered(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                แก้ไขการจัดส่ง
                            </div>
                            <div className="text-xs text-slate-500">
                                {shipment.deal_title}
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

                <div className="px-4 py-3 space-y-4">
                    {/* Status Control */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">สถานะขนส่ง</span>
                            <span
                                className={[
                                    'px-2 py-0.5 text-xs rounded-full border font-medium',
                                    status === 'draft' && 'border-yellow-500/60 text-yellow-600 bg-yellow-50',
                                    status === 'completed' && 'border-emerald-500/60 text-emerald-600 bg-emerald-50',
                                    status === 'cancelled' && 'border-red-500/60 text-red-600 bg-red-50',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                {SHIPMENT_STATUS_LABELS[status]}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={isCompleted || isCancelled || !!updatingStatus}
                                onClick={() => handleChangeStatus('completed')}
                                className={[
                                    'flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium border transition-colors',
                                    'border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50',
                                    (isCompleted || isCancelled || updatingStatus) && 'opacity-50 cursor-not-allowed hover:bg-white',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                {updatingStatus === 'completed' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                )}
                                ปิดงานขนส่ง
                            </button>

                            <button
                                type="button"
                                disabled={isCancelled || !!updatingStatus}
                                onClick={() => handleChangeStatus('cancelled')}
                                className={[
                                    'flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium border transition-colors',
                                    'border-red-200 text-red-700 bg-white hover:bg-red-50',
                                    (isCancelled || updatingStatus) && 'opacity-50 cursor-not-allowed hover:bg-white',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                {updatingStatus === 'cancelled' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <XCircle className="w-3 h-3" />
                                )}
                                ยกเลิกขนส่ง
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
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
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    ค่าขนส่ง (ราคาจริง) ฿
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
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Tracking / เลขอ้างอิง
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
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-sky-600" />
                                    <span className="text-xs font-medium text-slate-700">จุดลงต้น (Dropoff Location)</span>
                                </div>
                                {deliveredAt && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <PackageCheck className="w-3 h-3" />
                                        ส่งมอบแล้ว {new Date(deliveredAt).toLocaleDateString('th-TH')}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">ที่อยู่จุดลงต้น</label>
                                    <input
                                        type="text"
                                        value={dropoffAddress}
                                        onChange={(e) => setDropoffAddress(e.target.value)}
                                        placeholder="เช่น 123 ถ.สุขุมวิท กทม."
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Google Maps URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={dropoffMapUrl}
                                            onChange={(e) => setDropoffMapUrl(e.target.value)}
                                            placeholder="วาง URL จาก Google Maps"
                                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                                        />
                                        {dropoffMapUrl && (
                                            <button
                                                type="button"
                                                onClick={() => openInGoogleMaps(dropoffMapUrl)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
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
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
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

                                {/* Mark Delivered Button */}
                                {!deliveredAt && (
                                    <button
                                        type="button"
                                        onClick={handleMarkDelivered}
                                        disabled={markingDelivered}
                                        className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                        {markingDelivered ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <PackageCheck className="w-3 h-3" />
                                        )}
                                        {markingDelivered ? "กำลังบันทึก..." : "ส่งมอบต้นไม้แล้ว (Mark Delivered)"}
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
                                ปิด
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                {loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditShipmentModal;
