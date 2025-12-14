import React, { useEffect, useState } from "react";
import { Save, RefreshCw, AlertCircle } from "lucide-react";
import { useCommissionConfig } from "../../hooks/useCommissionConfig";

const CommissionConfigPage = () => {
    const { config, loading, error, reload, saveConfig } = useCommissionConfig();
    const [localConfig, setLocalConfig] = useState(null);
    const [saving, setSaving] = useState(false);

    // Sync local state with fetched config
    useEffect(() => {
        if (config) {
            setLocalConfig(config);
        }
    }, [config]);

    const handleChange = (field, value) => {
        if (!localConfig) return;
        setLocalConfig({
            ...localConfig,
            [field]: value === "" ? "" : Number(value),
        });
    };

    const handleSave = async () => {
        if (!localConfig) return;
        setSaving(true);

        const result = await saveConfig(localConfig);

        if (result.success) {
            alert("บันทึกค่าคอมมิชชั่นเรียบร้อยแล้ว");
        } else {
            alert(`บันทึกไม่สำเร็จ: ${result.error?.message || "Unknown error"}`);
        }
        setSaving(false);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">ตั้งค่าคอมมิชชั่น</h1>

            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700 border border-blue-200">
                <p className="font-medium">หมายเหตุ:</p>
                <p>การเปลี่ยนแปลงค่าคอมมิชชั่นในหน้านี้จะมีผลกับ <strong>ดีลใหม่</strong> เท่านั้น</p>
                <p>สำหรับดีลเดิมที่ต้องการคำนวณใหม่ กรุณาใช้ปุ่ม "Recalculate" ในหน้ารายละเอียดของดีลนั้นๆ</p>
            </div>

            <div className="flex justify-end mb-4">
                <button
                    onClick={reload}
                    disabled={loading || saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reload
                </button>
            </div>

            {loading && <div>กำลังโหลด...</div>}

            {/* Show error if it's a real fetch error (not just fallback) */}
            {
                error && config?.is_fallback && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <span>ไม่พบข้อมูล Config ในฐานข้อมูล (แสดงค่า Demo) - กรุณารัน SQL Script</span>
                    </div>
                )
            }

            {
                localConfig && (
                    <div className="space-y-4 rounded-xl border p-6 bg-white shadow-sm">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-700">
                                    Referral Rate (เช่น 0.05 = 5%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.referral_rate}
                                    onChange={(e) => handleChange("referral_rate", e.target.value)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-700">
                                    Sales Agent Rate (เช่น 0.10 = 10%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.sales_rate}
                                    onChange={(e) => handleChange("sales_rate", e.target.value)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-700">
                                    Team Target (เป้ายอดขายทีมต่อเดือน)
                                </label>
                                <input
                                    type="number"
                                    step="1000"
                                    value={localConfig.team_target}
                                    onChange={(e) => handleChange("team_target", e.target.value)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-700">
                                    Team Override Rate (เช่น 0.05 = 5%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.team_rate}
                                    onChange={(e) => handleChange("team_rate", e.target.value)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-700">
                                    Solo Rate (หัวหน้าขายคนเดียวเกินเป้า)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.solo_rate}
                                    onChange={(e) => handleChange("solo_rate", e.target.value)}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t mt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving || localConfig.is_fallback}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default CommissionConfigPage;
