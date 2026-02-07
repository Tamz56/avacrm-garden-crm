import React from "react";
import { FileText, Paperclip } from "lucide-react";

export function ZoneFilesNotesTab({ isDarkMode = false }: { isDarkMode?: boolean }) {
    return (
        <div className="space-y-6">
            <section className={`rounded-xl shadow-sm border p-6 ${isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-4">
                    <FileText className={`w-5 h-5 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`} />
                    <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>เอกสาร & บันทึก (Files & Notes)</h2>
                </div>

                <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    พื้นที่สำหรับจัดเก็บเอกสารที่เกี่ยวข้องกับโซนนี้ เช่น ภาพถ่ายแผนผัง, ใบตรวจนับ, หรือบันทึกข้อความสำคัญต่างๆ
                </p>

                <div className={`rounded-lg p-4 border ${isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"}`}>
                    <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        <Paperclip className="w-4 h-4 text-emerald-500" />
                        Coming Soon
                    </h3>
                    <ul className={`list-disc list-inside text-sm space-y-2 ml-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        <li>ระบบแนบไฟล์รูปภาพ / PDF</li>
                        <li>บันทึกข้อความ (Memo / Notes)</li>
                        <li>ประวัติการแนบไฟล์</li>
                    </ul>
                </div>

                <div className="mt-6 flex gap-3">
                    <button disabled className={`px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium ${isDarkMode ? "bg-indigo-900/20 text-indigo-400/50" : "bg-indigo-50 text-indigo-300"}`}>
                        + เพิ่มบันทึก (Coming Soon)
                    </button>
                    <button disabled className={`px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium ${isDarkMode ? "bg-white/5 text-slate-500" : "bg-slate-50 text-slate-300"}`}>
                        แนบไฟล์ (Coming Soon)
                    </button>
                </div>
            </section>
        </div>
    );
}
