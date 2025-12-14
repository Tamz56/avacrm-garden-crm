import React from "react";
import { useProductStockDetail } from "../../hooks/useProductStockDetail";
import { AlertCircle, Leaf, MapPin, Package } from "lucide-react";

interface ProductDetailSectionProps {
    productId: string | null;
}

export const ProductDetailSection: React.FC<ProductDetailSectionProps> = ({ productId }) => {
    const { data, isLoading } = useProductStockDetail(productId);

    if (!productId) {
        return (
            <section className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Leaf className="h-6 w-6" />
                </div>
                <h3 className="text-base font-medium text-slate-900">เลือกสินค้า</h3>
                <p className="text-sm text-slate-500">เลือกต้นไม้ / สินค้าทางซ้ายเพื่อดูรายละเอียด</p>
            </section>
        );
    }

    if (isLoading || !data) {
        return <section className="rounded-2xl border border-slate-100 bg-white p-5 text-center text-slate-400">กำลังโหลดข้อมูล...</section>;
    }

    const formatBaht = (num: number) => {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            maximumFractionDigits: 0,
        }).format(num);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header Card */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-sm">
                        {data.shortName}
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">สินค้า / ต้นไม้</div>
                        <div className="text-xl font-bold text-slate-900">{data.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                            รหัส: {data.code} · ประเภท: {data.category || "-"}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8 text-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">จำนวนคงเหลือรวม</div>
                            <div className="font-bold text-slate-900">{data.totalAvailable.toLocaleString()} ต้น</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">กระจายอยู่ใน</div>
                            <div className="font-bold text-slate-900">{data.zoneCount} โซน</div>
                        </div>
                    </div>
                    {data.defaultPrice != null && (
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                <Leaf className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">ราคาอ้างอิงโดยประมาณ</div>
                                <div className="font-bold text-slate-900">{formatBaht(data.defaultPrice)}/ต้น</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900">ข้อมูลสินค้า</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                            <dt className="text-slate-500">ประเภท</dt>
                            <dd className="font-medium text-slate-900">{data.category || "-"}</dd>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                            <dt className="text-slate-500">ชื่อวิทยาศาสตร์</dt>
                            <dd className="font-medium text-slate-900">{data.scientific_name || "-"}</dd>
                        </div>
                        <div className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                            <dt className="text-slate-500">หมายเหตุ</dt>
                            <dd className="font-medium text-slate-900">{data.note || "-"}</dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-slate-900">สถานะสต็อกรวม</h3>
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <p>
                            ข้อมูลบนหน้านี้ดึงจากฐานข้อมูล Supabase จริง
                            เมื่อมีการปรับสต็อก / ผูกกับดีลในอนาคต
                            จำนวนคงเหลือจะอัปเดตอัตโนมัติ
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};
