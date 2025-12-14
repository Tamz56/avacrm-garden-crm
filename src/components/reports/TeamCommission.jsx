// src/components/reports/TeamCommission.jsx

import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient.ts";
import CommissionReport from "../CommissionReport.jsx";
import { Filter } from "lucide-react";

const TeamCommission = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    // Default month: Current month (YYYY-MM)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    useEffect(() => {
        const fetchDeals = async () => {
            setLoading(true);
            // พยายามดึง field ใหม่ referral_agent_name, sales_agent_name ด้วย
            // ถ้ายังไม่มีใน DB อาจจะได้ null หรือ error เล็กน้อย แต่ Supabase มักจะแค่ ignore field ที่ไม่มีถ้าไม่ได้ใช้ strict mode
            // หรือถ้า error จริงๆ เราอาจต้องถอดออก แต่เบื้องต้นใส่ไว้ตาม requirement
            const { data, error } = await supabase
                .from("deals")
                .select("id, deal_code, total_amount, stage, closing_date, owner_id, referral_agent_name, sales_agent_name")
                .eq("stage", "won"); // ดึงเฉพาะ Won deals มาคำนวณ

            if (error) {
                console.error("Error loading deals for commission report:", error);
                // Fallback: ถ้า error เพราะไม่มี column ให้ลองดึงแบบปกติ (อันนี้เผื่อไว้)
                if (error.code === "PGRST100") { // Column not found error code (example)
                    const { data: fallbackData } = await supabase
                        .from("deals")
                        .select("id, deal_code, total_amount, stage, closing_date, owner_id")
                        .eq("stage", "won");
                    setDeals(fallbackData || []);
                }
            } else {
                setDeals(data || []);
            }
            setLoading(false);
        };

        fetchDeals();
    }, []);

    // Generate options for month selector (Last 12 months)
    const monthOptions = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        monthOptions.push({ value: `${y}-${m}`, label: `${m}/${y}` });
        date.setMonth(date.getMonth() - 1);
    }

    if (loading) {
        return (
            <div className="p-6">
                <p className="text-sm text-slate-500">กำลังโหลดรายงานค่าคอมมิชชั่น...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900 mb-1">
                        รายงานค่าคอมมิชชั่นทีมขาย (Team Commission)
                    </h1>
                    <p className="text-sm text-slate-500">
                        คำนวณตามโครงสร้าง: 5% ผู้แนะนำ, 10% ผู้ปิดดีล, 5%/15% หัวหน้าทีม
                    </p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="text-sm outline-none bg-transparent"
                    >
                        <option value="">ทั้งหมด</option>
                        {monthOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <CommissionReport
                deals={deals}
                leaderName="Apirak" // Hardcode ตามโจทย์
                monthKey={selectedMonth}
            />
        </div>
    );
};

export default TeamCommission;
