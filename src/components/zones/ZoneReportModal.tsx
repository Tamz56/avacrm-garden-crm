import React from 'react';
import { X, Printer, Loader2, FileText, Calendar, MapPin, ClipboardList, Heart, Scale, Wrench, TrendingUp } from 'lucide-react';
import { useZoneAuditEvents, ZoneAuditEvent } from '../../hooks/useZoneAuditEvents';
import { useZoneInspection } from '../../hooks/useZoneInspection';

// Print styles - will be injected when modal opens
const printStyles = `
@media print {
    body * { visibility: hidden !important; }
    .zone-report-print-content, .zone-report-print-content * { visibility: visible !important; }
    .zone-report-print-content { 
        position: absolute !important; 
        left: 0 !important; 
        top: 0 !important; 
        width: 100% !important;
        padding: 20px !important;
        background: white !important;
    }
    .no-print { display: none !important; }
    @page { margin: 1cm; }
}
`;

interface ZoneReportModalProps {
    open: boolean;
    onClose: () => void;
    zone: {
        id: string;
        name: string;
        farm_name?: string;
        area_rai?: number;
        area_width_m?: number;
        area_length_m?: number;
        planting_rows?: number;
        plot_type?: string;
    };
    plotTypeName?: string;
}

const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const eventTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    inspection: { label: 'ตรวจแปลง', icon: <ClipboardList className="w-4 h-4" />, color: 'bg-sky-100 text-sky-700' },
    maintenance: { label: 'บำรุงรักษา', icon: <Wrench className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    checklist_weekly: { label: 'เช็คลิสต์รายสัปดาห์', icon: <FileText className="w-4 h-4" />, color: 'bg-violet-100 text-violet-700' },
    checklist_monthly: { label: 'เช็คลิสต์รายเดือน', icon: <FileText className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-700' },
    health_assessment: { label: 'ประเมินสุขภาพ', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
    form_score: { label: 'ประเมินทรงต้น', icon: <Scale className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
    growth_snapshot: { label: 'บันทึกการเติบโต', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-lime-100 text-lime-700' },
};

export const ZoneReportModal: React.FC<ZoneReportModalProps> = ({ open, onClose, zone, plotTypeName }) => {
    const { events, loading: eventsLoading } = useZoneAuditEvents(zone.id);
    const { latestInspection, loading: inspectionLoading } = useZoneInspection(zone.id);

    const handlePrint = () => {
        window.print();
    };

    // Inject print styles
    React.useEffect(() => {
        if (open) {
            const styleEl = document.createElement('style');
            styleEl.id = 'zone-report-print-styles';
            styleEl.textContent = printStyles;
            document.head.appendChild(styleEl);
            return () => {
                const el = document.getElementById('zone-report-print-styles');
                if (el) el.remove();
            };
        }
    }, [open]);

    if (!open) return null;

    const loading = eventsLoading || inspectionLoading;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-auto py-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
                {/* Header - No Print */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        รายงานแปลง
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                        >
                            <Printer className="w-4 h-4" />
                            พิมพ์รายงาน
                        </button>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="zone-report-print-content p-6 space-y-6">
                    {/* Zone Header */}
                    <section className="border-b border-slate-200 pb-4">
                        <h1 className="text-2xl font-bold text-slate-900">{zone.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {zone.farm_name || '-'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                                {plotTypeName || 'ไม่ระบุประเภท'}
                            </span>
                            {zone.area_rai && (
                                <span>พื้นที่: {zone.area_rai} ไร่</span>
                            )}
                            {zone.area_width_m && zone.area_length_m && (
                                <span>ขนาด: {zone.area_width_m}×{zone.area_length_m} ม.</span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                            วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </section>

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    )}

                    {!loading && (
                        <>
                            {/* Latest Inspection */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-sky-600" />
                                    ผลตรวจแปลงล่าสุด
                                </h3>
                                {latestInspection ? (
                                    <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <div className="text-xs text-slate-500">วันที่ตรวจ</div>
                                                <div className="font-semibold text-slate-800">{formatDate(latestInspection.check_date)}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">จำนวนต้น</div>
                                                <div className="font-semibold text-slate-800">
                                                    {latestInspection.tree_count?.toLocaleString() ?? '-'} ต้น
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">ขนาดลำต้น</div>
                                                <div className="font-semibold text-slate-800">
                                                    {latestInspection.trunk_size_inch ?? '-'} นิ้ว
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">ความสูง</div>
                                                <div className="font-semibold text-slate-800">
                                                    {latestInspection.height_m ?? '-'} ม.
                                                </div>
                                            </div>
                                        </div>
                                        {latestInspection.maintenance_notes && (
                                            <div className="mt-3 text-sm text-slate-600 bg-white rounded-lg p-3 border border-sky-100">
                                                <span className="text-xs text-slate-500">หมายเหตุ: </span>
                                                {latestInspection.maintenance_notes}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic">ยังไม่มีผลตรวจแปลง</div>
                                )}
                            </section>

                            {/* Placeholder Sections for Future Features */}
                            <section className="opacity-50">
                                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    เช็คลิสต์รายสัปดาห์/รายเดือน
                                </h3>
                                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 text-sm text-slate-400 text-center">
                                    (ยังไม่มีข้อมูล - รอเปิดใช้งานในเวอร์ชันถัดไป)
                                </div>
                            </section>

                            <section className="opacity-50">
                                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                    <Heart className="w-4 h-4" />
                                    ประเมินสุขภาพต้นไม้
                                </h3>
                                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 text-sm text-slate-400 text-center">
                                    (ยังไม่มีข้อมูล - รอเปิดใช้งานในเวอร์ชันถัดไป)
                                </div>
                            </section>

                            <section className="opacity-50">
                                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                    <Scale className="w-4 h-4" />
                                    ประเมินทรงต้น / จุดบกพร่อง
                                </h3>
                                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 text-sm text-slate-400 text-center">
                                    (ยังไม่มีข้อมูล - รอเปิดใช้งานในเวอร์ชันถัดไป)
                                </div>
                            </section>

                            {/* Event Timeline */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-indigo-600" />
                                    ไทม์ไลน์กิจกรรม (ล่าสุด 10 รายการ)
                                </h3>
                                {events.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic">ยังไม่มีกิจกรรม</div>
                                ) : (
                                    <div className="space-y-2">
                                        {events.slice(0, 10).map((e: ZoneAuditEvent) => {
                                            const typeInfo = eventTypeLabels[e.event_type] || {
                                                label: e.event_type,
                                                icon: <FileText className="w-4 h-4" />,
                                                color: 'bg-slate-100 text-slate-700',
                                            };
                                            return (
                                                <div key={e.id} className="flex items-start gap-3 text-sm border-l-2 border-slate-200 pl-3 py-1">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${typeInfo.color}`}>
                                                        {typeInfo.icon}
                                                        {typeInfo.label}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-slate-700">{e.notes || '-'}</div>
                                                        <div className="text-xs text-slate-400">{formatDate(e.event_date)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* Growth Snapshot Placeholder */}
                            <section className="opacity-50">
                                <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    สรุปการเติบโต (3/6/12 เดือน)
                                </h3>
                                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 text-sm text-slate-400 text-center">
                                    (ยังไม่มีข้อมูล - รอเปิดใช้งานในเวอร์ชันถัดไป)
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZoneReportModal;
