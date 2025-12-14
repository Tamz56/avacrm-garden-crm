// src/components/SettingsPage.jsx
import React from "react";

const SettingsPage = () => {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-semibold text-slate-900">
                ตั้งค่า AvaCRM
            </h1>
            <p className="text-slate-500">
                หน้าตั้งค่านี้ยังเป็นเวอร์ชันแรกเริ่ม สามารถเพิ่มเมนูตั้งค่าอื่น ๆ ภายหลังได้
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="font-medium text-slate-800 mb-1">
                        การตั้งค่าสต็อกต้นไม้ & แปลงปลูก
                    </h2>
                    <p className="text-sm text-slate-500 mb-3">
                        ใช้หน้าสต็อกต้นไม้ใน Dashboard เพื่อตั้งค่าข้อมูลต้นไม้เริ่มต้น
                    </p>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        Tip: ข้อมูลในหน้านี้จะใช้เพื่อวางระบบในอนาคต
                    </span>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="font-medium text-slate-800 mb-1">
                        การตั้งค่ารายงาน & KPI
                    </h2>
                    <p className="text-sm text-slate-500 mb-3">
                        จะเพิ่มเมนูสำหรับกำหนดค่ารายงาน / KPI ในเวอร์ชันถัดไป
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
