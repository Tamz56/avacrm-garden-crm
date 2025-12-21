import React from "react";
import { FileText, Paperclip } from "lucide-react";

export function ZoneFilesNotesTab() {
    return (
        <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-slate-800">เอกสาร & บันทึก (Files & Notes)</h2>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                    พื้นที่สำหรับจัดเก็บเอกสารที่เกี่ยวข้องกับโซนนี้ เช่น ภาพถ่ายแผนผัง, ใบตรวจนับ, หรือบันทึกข้อความสำคัญต่างๆ
                </p>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-emerald-500" />
                        Coming Soon
                    </h3>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-2">
                        <li>ระบบแนบไฟล์รูปภาพ / PDF</li>
                        <li>บันทึกข้อความ (Memo / Notes)</li>
                        <li>ประวัติการแนบไฟล์</li>
                    </ul>
                </div>

                <div className="mt-6 flex gap-3">
                    <button disabled className="px-4 py-2 bg-indigo-50 text-indigo-300 rounded-lg cursor-not-allowed text-sm font-medium">
                        + เพิ่มบันทึก (Coming Soon)
                    </button>
                    <button disabled className="px-4 py-2 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed text-sm font-medium">
                        แนบไฟล์ (Coming Soon)
                    </button>
                </div>
            </section>
        </div>
    );
}
