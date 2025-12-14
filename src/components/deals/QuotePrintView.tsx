import React from 'react';
import { DealItemRow } from './DealDetailLayout';

type QuotePrintViewProps = {
    deal: {
        id: string;
        code: string;
        title: string;
        created_at?: string | null;
    };
    items: DealItemRow[];
    customerInfo: {
        name: string;
        phone?: string;
        address?: string;
    };
    summary: {
        totalAmount: number;
        depositAmount?: number;
    };
};

export const QuotePrintView: React.FC<QuotePrintViewProps> = ({
    deal,
    items,
    customerInfo,
    summary
}) => {
    const today = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div id="quote-print" className="hidden print:block bg-white text-black p-8 max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div className="flex items-center gap-4">
                    {/* Logo Placeholder */}
                    <div className="w-16 h-16 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                        A
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AVAFARM 888</h1>
                        <p className="text-sm text-gray-500">ระบบบริหารจัดการฟาร์มครบวงจร</p>
                        <p className="text-xs text-gray-400 mt-1">
                            123 หมู่ 4 ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา 30130
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-emerald-600 uppercase tracking-wide">ใบเสนอราคา</h2>
                    <p className="text-sm text-gray-500 mt-1">QUOTATION</p>
                    <div className="mt-4 text-sm">
                        <p><span className="font-semibold">เลขที่:</span> {deal.code}</p>
                        <p><span className="font-semibold">วันที่:</span> {today}</p>
                    </div>
                </div>
            </div>

            {/* Customer & Deal Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">ข้อมูลลูกค้า</h3>
                    <p className="font-semibold text-lg">{customerInfo.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{customerInfo.phone || "-"}</p>
                    <p className="text-sm text-gray-600 mt-1">{customerInfo.address || "-"}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">รายละเอียดการสั่งซื้อ</h3>
                    <p className="font-semibold">{deal.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        เงื่อนไขการชำระเงิน: มัดจำ 30% ก่อนขุดล้อม
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wide border-b border-gray-200">
                            <th className="py-3 px-4 font-semibold rounded-tl-lg">ลำดับ</th>
                            <th className="py-3 px-4 font-semibold">รายการสินค้า</th>
                            <th className="py-3 px-4 font-semibold text-center">จำนวน</th>
                            <th className="py-3 px-4 font-semibold text-right">ราคา/หน่วย</th>
                            <th className="py-3 px-4 font-semibold text-right rounded-tr-lg">รวม</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {items.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100">
                                <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                                <td className="py-3 px-4 font-medium text-gray-900">
                                    {item.description}
                                    {item.subText && (
                                        <div className="text-xs text-gray-500 mt-0.5">{item.subText}</div>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-center">{item.quantity}</td>
                                <td className="py-3 px-4 text-right">{item.unitPrice.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right font-semibold">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>รวมเป็นเงิน</span>
                        <span>{summary.totalAmount.toLocaleString()} บาท</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>ภาษีมูลค่าเพิ่ม (7%)</span>
                        <span>-</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-emerald-600 border-t border-gray-200 pt-3">
                        <span>ยอดสุทธิ</span>
                        <span>{summary.totalAmount.toLocaleString()} บาท</span>
                    </div>
                </div>
            </div>

            {/* Footer / Signature */}
            <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-200">
                <div className="text-center">
                    <div className="h-16 border-b border-dashed border-gray-300 mb-2"></div>
                    <p className="text-sm font-medium text-gray-700">ผู้สั่งซื้อสินค้า</p>
                    <p className="text-xs text-gray-500">วันที่ .......................................</p>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-dashed border-gray-300 mb-2"></div>
                    <p className="text-sm font-medium text-gray-700">ผู้รับมอบอำนาจ / ผู้ขาย</p>
                    <p className="text-xs text-gray-500">วันที่ .......................................</p>
                </div>
            </div>
        </div>
    );
};
