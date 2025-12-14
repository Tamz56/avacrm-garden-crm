import React from "react";
import CommissionSummaryCard from "../components/CommissionSummaryCard";
import CommissionDetailTable from "../components/CommissionDetailTable";
import { useProfileMonthlyCommissionDetails } from "../hooks/useProfileMonthlyCommissionDetails";

const CommissionReportPage: React.FC = () => {
    // TODO: ดึง currentUserProfileId จาก context / auth ของคุณ
    // ตอนนี้ใช้ค่า hard-code ไปก่อน (Apirak's profile_id)
    const currentUserProfileId = "36ee44ca-1dad-44ad-83dd-43646073f2c2";

    const {
        rows,
        loading,
        error,
        refetch,
    } = useProfileMonthlyCommissionDetails(currentUserProfileId);

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        รายงานคอมมิชชั่น
                    </h1>
                    <p className="text-sm text-slate-500">
                        สรุปค่าคอมมิชชั่นของเดือนนี้ และรายละเอียดรายดีล
                    </p>
                </div>

                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CommissionSummaryCard profileId={currentUserProfileId} />
                </div>

                {/* Detail Table Section */}
                <div className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
                            {error}
                        </div>
                    )}

                    <CommissionDetailTable
                        rows={rows}
                        isLoading={loading}
                        currentProfileId={currentUserProfileId}
                        onRefetch={refetch}
                    />
                </div>
            </div>
        </div>
    );
};

export default CommissionReportPage;
