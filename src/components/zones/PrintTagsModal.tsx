import React from "react";
import { QRCodeSVG } from "qrcode.react";

type PrintTagRow = {
    id: string;
    tag_code: string;
    species_name_th: string | null;
    size_label: string | null;
    qty: number | null;
    zone_name: string | null;
    planting_row: number | null;
    planting_position: number | null;
    notes: string | null;
};

type Props = {
    open: boolean;
    onClose: () => void;
    rows: PrintTagRow[];
};

export const PrintTagsModal: React.FC<Props> = ({ open, onClose, rows }) => {
    const handlePrint = () => {
        window.print();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center print:bg-white print:static print:block">
            <div className="bg-white rounded-lg shadow-lg w-[900px] max-h-[90vh] flex flex-col print:shadow-none print:w-full print:max-h-none print:rounded-none">
                <div className="px-4 py-3 border-b flex justify-between items-center print:hidden">
                    <h2 className="font-semibold text-lg">แผ่นพิมพ์ Tag ({rows.length})</h2>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
                            onClick={onClose}
                        >
                            ปิด
                        </button>
                        <button
                            className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600"
                            onClick={handlePrint}
                        >
                            พิมพ์
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-auto print:p-0 print:overflow-visible">
                    <div className="grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2 print:block">
                        {/* Note: print:block + float/inline-block might be better for masonry, but grid is usually fine for fixed size cards */}
                        <div className="contents print:grid print:grid-cols-3 print:gap-4">
                            {rows.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="border rounded p-2 text-xs flex flex-col items-center justify-between print:border print:rounded print:break-inside-avoid print:page-break-inside-avoid"
                                    style={{ pageBreakInside: "avoid" }}
                                >
                                    <div className="mb-2 flex items-center justify-center">
                                        <QRCodeSVG value={tag.tag_code} size={80} />
                                    </div>

                                    <div className="text-center w-full">
                                        <div className="font-bold text-sm mb-1">{tag.tag_code}</div>
                                        <div className="font-medium truncate px-1" title={tag.species_name_th || ""}>{tag.species_name_th}</div>
                                        <div>ขนาด {tag.size_label} นิ้ว</div>
                                        <div className="text-slate-600 mt-1">
                                            {tag.zone_name}
                                            {(tag.planting_row || tag.planting_position) && (
                                                <>
                                                    <br />
                                                    {tag.planting_row ? `แถว ${tag.planting_row}` : ""}
                                                    {tag.planting_row && tag.planting_position ? " / " : ""}
                                                    {tag.planting_position ? `ต้นที่ ${tag.planting_position}` : ""}
                                                </>
                                            )}
                                        </div>
                                        {tag.notes && (
                                            <div className="mt-1 text-[10px] text-gray-500 truncate max-w-full px-2">
                                                {tag.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white;
          }
          /* Hide everything else when printing */
          body > *:not(.fixed) {
            display: none;
          }
          .fixed {
            position: static !important;
            z-index: auto !important;
            background: white !important;
            width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
        </div>
    );
};
