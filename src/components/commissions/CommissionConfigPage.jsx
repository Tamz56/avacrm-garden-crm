import React, { useEffect, useState } from "react";
import { Save, RefreshCw, AlertCircle } from "lucide-react";
import { useCommissionConfig } from "../../hooks/useCommissionConfig";

// Theme tokens
const shell =
    "min-h-screen bg-white text-slate-900 dark:bg-black dark:text-slate-100";

const surface =
    "rounded-2xl border border-slate-200 bg-white shadow-sm " +
    "dark:border-white/10 dark:bg-white/5";

const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 " +
    "text-slate-900 placeholder-slate-400 shadow-sm outline-none " +
    "focus:ring-2 focus:ring-emerald-500/30 " +
    "dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-400 " +
    "dark:focus:ring-emerald-400/30";

const ghostBtn =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 " +
    "text-sm font-medium text-slate-700 hover:bg-slate-50 " +
    "dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10";

const info =
    "rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 " +
    "dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100";

const warn =
    "flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 " +
    "dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100";

const fieldLabel = "text-xs font-medium text-slate-700 dark:text-slate-200";

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
        <div className={`${shell} p-6`}>
            <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">ตั้งค่าคอมมิชชั่น</h1>

            <div className={`${info} mb-6`}>
                <p className="font-medium">หมายเหตุ:</p>
                <p className="text-sm opacity-90 mt-1">การเปลี่ยนแปลงค่าคอมมิชชั่นในหน้านี้จะมีผลกับ <strong>ดีลใหม่</strong> เท่านั้น</p>
                <p className="text-sm opacity-90">สำหรับดีลเดิมที่ต้องการคำนวณใหม่ กรุณาใช้ปุ่ม "Recalculate" ในหน้ารายละเอียดของดีลนั้นๆ</p>
            </div>

            <div className="flex justify-end mb-4">
                <button
                    onClick={reload}
                    disabled={loading || saving}
                    className={ghostBtn}
                >
                    <RefreshCw className="w-4 h-4" />
                    Reload
                </button>
            </div>

            {loading && <div className="text-slate-500 dark:text-slate-400">กำลังโหลด...</div>}

            {/* Show error if it's a real fetch error (not just fallback) */}
            {
                error && config?.is_fallback && (
                    <div className={`${warn} mb-4`}>
                        <AlertCircle className="h-4 w-4" />
                        <span>ไม่พบข้อมูล Config ในฐานข้อมูล (แสดงค่า Demo) - กรุณารัน SQL Script</span>
                    </div>
                )
            }

            {
                localConfig && (
                    <div className={`${surface} p-6`}>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={fieldLabel}>
                                    Referral Rate (เช่น 0.05 = 5%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.referral_rate}
                                    onChange={(e) => handleChange("referral_rate", e.target.value)}
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={fieldLabel}>
                                    Sales Agent Rate (เช่น 0.10 = 10%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.sales_rate}
                                    onChange={(e) => handleChange("sales_rate", e.target.value)}
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={fieldLabel}>
                                    Team Target (เป้ายอดขายทีมต่อเดือน)
                                </label>
                                <input
                                    type="number"
                                    step="1000"
                                    value={localConfig.team_target}
                                    onChange={(e) => handleChange("team_target", e.target.value)}
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={fieldLabel}>
                                    Team Override Rate (เช่น 0.05 = 5%)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.team_rate}
                                    onChange={(e) => handleChange("team_rate", e.target.value)}
                                    className={input}
                                />
                            </div>

                            <div>
                                <label className={fieldLabel}>
                                    Solo Rate (หัวหน้าขายคนเดียวเกินเป้า)
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={localConfig.solo_rate}
                                    onChange={(e) => handleChange("solo_rate", e.target.value)}
                                    className={input}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
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

