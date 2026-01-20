import React, { useEffect, useMemo, useState } from "react";
import { X, DollarSign, Activity, AlertCircle } from "lucide-react";
import { supabase } from "../../supabaseClient.ts";
import { useCommissionConfig } from "../../hooks/useCommissionConfig";

const toBaht = (val) =>
    `฿${(val || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;

const ROLE_LABELS = {
    referral_agent: "ผู้แนะนำ (Referral)",
    sales_agent: "Sales Agent",
    team_leader: "หัวหน้าทีม (Leader)",
};

const DealCommissionPanel = ({ dealId, dealAmount, onClose }) => {
    const [, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [rows, setRows] = useState([]);

    const { config } = useCommissionConfig();

    useEffect(() => {
        if (!dealId) return;

        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);
            try {
                const { data, error } = await supabase
                    .from("v_deal_commission_detail")
                    .select(
                        "commission_id, deal_id, deal_title, deal_amount, profile_id, sales_name, role, commission_rate, base_amount, commission_amount, status, created_at, paid_at"
                    )
                    .eq("deal_id", dealId)
                    .order("commission_amount", { ascending: false });

                if (error) throw error;

                setRows(data || []);
            } catch (err) {
                console.error(err);
                setErrorMsg(
                    err?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลค่าคอมมิชชั่นของดีลนี้"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dealId]);

    const summary = useMemo(() => {
        // 1. ถ้ามีข้อมูลจริงจาก DB ให้ใช้ข้อมูลนั้น
        if (rows.length > 0) {
            const dealTitle = rows[0].deal_title;
            const dAmount = Number(rows[0].deal_amount) || 0;

            let total = 0;
            const byRole = {
                referral_agent: 0,
                sales_agent: 0,
                team_leader: 0,
            };

            rows.forEach((r) => {
                const amt = Number(r.commission_amount) || 0;
                total += amt;
                if (byRole[r.role] !== undefined) {
                    byRole[r.role] += amt;
                }
            });

            return {
                dealTitle,
                dealAmount: dAmount,
                totalCommission: total,
                byRole,
                isPreview: false,
            };
        }

        // 2. ถ้าไม่มีข้อมูล (ยังไม่ Won) ให้คำนวณ Preview จาก Config
        if (config && dealAmount) {
            const referral = dealAmount * (config.referral_rate || 0);
            const sales = dealAmount * (config.sales_rate || 0);
            const leader = dealAmount * (config.team_rate || 0);

            return {
                dealTitle: "Preview (ประมาณการ)",
                dealAmount: dealAmount,
                totalCommission: referral + sales + leader,
                byRole: {
                    referral_agent: referral,
                    sales_agent: sales,
                    team_leader: leader
                },
                isPreview: true,
                previewRates: {
                    referral: (config.referral_rate || 0) * 100,
                    sales: (config.sales_rate || 0) * 100,
                    leader: (config.team_rate || 0) * 100
                }
            };
        }

        // 3. Fallback ว่างเปล่า
        return {
            dealTitle: "-",
            dealAmount: 0,
            totalCommission: 0,
            byRole: {
                referral_agent: 0,
                sales_agent: 0,
                team_leader: 0,
            },
        };
    }, [rows, config, dealAmount]);

    const handleRecalculate = async () => {
        if (!window.confirm("ระบบจะคำนวณค่าคอมมิชชั่นดีลนี้ใหม่ด้วยเรตปัจจุบัน คุณแน่ใจหรือไม่?")) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.rpc("recalc_deal_commissions", {
                p_deal_id: dealId,
            });

            if (error) throw error;

            // Refetch data after recalculation
            const { data, error: fetchError } = await supabase
                .from("v_deal_commission_detail")
                .select(
                    "commission_id, deal_id, deal_title, deal_amount, profile_id, sales_name, role, commission_rate, base_amount, commission_amount, status, created_at, paid_at"
                )
                .eq("deal_id", dealId)
                .order("commission_amount", { ascending: false });

            if (fetchError) throw fetchError;
            setRows(data || []);

        } catch (err) {
            console.error("Recalculate error:", err);
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/30">
            <div className="h-full w-full max-w-xl bg-white shadow-xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold flex items-center gap-2">
                            รายละเอียดค่าคอมมิชชั่นของดีล
                            {summary.isPreview && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                                    Preview Mode
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-gray-500">
                            {summary.dealTitle !== "-" ? summary.dealTitle : "กำลังโหลด..."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!summary.isPreview && (
                            <button
                                onClick={handleRecalculate}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                title="คำนวณใหม่ด้วยเรตปัจจุบัน (Recalculate)"
                            >
                                <Activity className="h-3 w-3" />
                                <span>Recalculate</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {errorMsg && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Summary cards */}
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        มูลค่าดีล (Deal Amount)
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {toBaht(summary.dealAmount)}
                                    </p>
                                </div>
                                <div className="rounded-full bg-blue-50 p-2">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-gray-500">
                                        ค่าคอมฯ รวม{summary.isPreview ? " (ประมาณ)" : ""}
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {toBaht(summary.totalCommission)}
                                    </p>
                                </div>
                                <div className="rounded-full bg-emerald-50 p-2">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-[11px] text-gray-500">ค่าคอมฯ Referral</p>
                                {summary.isPreview && <span className="text-[10px] text-gray-400">{summary.previewRates?.referral}%</span>}
                            </div>
                            <p className="mt-1 text-base font-semibold">
                                {toBaht(summary.byRole.referral_agent)}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-[11px] text-gray-500">ค่าคอมฯ Sales Agent</p>
                                {summary.isPreview && <span className="text-[10px] text-gray-400">{summary.previewRates?.sales}%</span>}
                            </div>
                            <p className="mt-1 text-base font-semibold">
                                {toBaht(summary.byRole.sales_agent)}
                            </p>
                        </div>

                        <div className="rounded-xl border bg-white p-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <p className="text-[11px] text-gray-500">ค่าคอมฯ Team Leader</p>
                                {summary.isPreview && <span className="text-[10px] text-gray-400">{summary.previewRates?.leader}%</span>}
                            </div>
                            <p className="mt-1 text-base font-semibold">
                                {toBaht(summary.byRole.team_leader)}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mt-2">
                        <h3 className="mb-2 text-xs font-semibold text-gray-700">
                            รายการค่าคอมมิชชั่น (ต่อบทบาท)
                        </h3>
                        {rows.length === 0 && !summary.isPreview ? (
                            <p className="text-xs text-gray-500">
                                ยังไม่มีค่าคอมมิชชั่นสำหรับดีลนี้
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-gray-50 text-left">
                                            <th className="px-3 py-2">ชื่อ</th>
                                            <th className="px-3 py-2">บทบาท</th>
                                            <th className="px-3 py-2 text-right">% คอมฯ</th>
                                            <th className="px-3 py-2 text-right">ยอดฐาน</th>
                                            <th className="px-3 py-2 text-right">ค่าคอมฯ</th>
                                            <th className="px-3 py-2">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Render Real Rows */}
                                        {rows.map((row) => (
                                            <tr
                                                key={row.commission_id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-3 py-2">{row.sales_name}</td>
                                                <td className="px-3 py-2">
                                                    {ROLE_LABELS[row.role] || row.role}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {row.commission_rate?.toFixed
                                                        ? row.commission_rate.toFixed(2)
                                                        : row.commission_rate}
                                                    %
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {toBaht(row.base_amount)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {toBaht(row.commission_amount)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Render Preview Rows if no real rows */}
                                        {rows.length === 0 && summary.isPreview && (
                                            <>
                                                <tr className="border-b last:border-0 bg-amber-50/30">
                                                    <td className="px-3 py-2 text-gray-400">(Referral)</td>
                                                    <td className="px-3 py-2">ผู้แนะนำ</td>
                                                    <td className="px-3 py-2 text-right">{summary.previewRates.referral.toFixed(2)}%</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.dealAmount)}</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.byRole.referral_agent)}</td>
                                                    <td className="px-3 py-2"><span className="text-amber-600 italic">Preview</span></td>
                                                </tr>
                                                <tr className="border-b last:border-0 bg-amber-50/30">
                                                    <td className="px-3 py-2 text-gray-400">(Sales)</td>
                                                    <td className="px-3 py-2">Sales Agent</td>
                                                    <td className="px-3 py-2 text-right">{summary.previewRates.sales.toFixed(2)}%</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.dealAmount)}</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.byRole.sales_agent)}</td>
                                                    <td className="px-3 py-2"><span className="text-amber-600 italic">Preview</span></td>
                                                </tr>
                                                <tr className="border-b last:border-0 bg-amber-50/30">
                                                    <td className="px-3 py-2 text-gray-400">(Leader)</td>
                                                    <td className="px-3 py-2">Team Leader</td>
                                                    <td className="px-3 py-2 text-right">{summary.previewRates.leader.toFixed(2)}%</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.dealAmount)}</td>
                                                    <td className="px-3 py-2 text-right">{toBaht(summary.byRole.team_leader)}</td>
                                                    <td className="px-3 py-2"><span className="text-amber-600 italic">Preview</span></td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t px-4 py-2 text-right">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DealCommissionPanel;
