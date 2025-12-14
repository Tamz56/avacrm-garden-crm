import React from 'react';
import { Scan, QrCode } from 'lucide-react';

interface SoftScannerCardProps {
    onOpenScanner: () => void;
    scannedCount: number;
    totalCount: number;
}

export const SoftScannerCard: React.FC<SoftScannerCardProps> = ({
    onOpenScanner,
    scannedCount,
    totalCount,
}) => {
    const progress = totalCount > 0 ? (scannedCount / totalCount) * 100 : 0;
    const isComplete = totalCount > 0 && scannedCount >= totalCount;

    return (
        <div
            onClick={onOpenScanner}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:hover:border-emerald-700"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'} group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors`}>
                        {isComplete ? <QrCode className="h-5 w-5" /> : <Scan className="h-5 w-5" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            Scan Tags
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isComplete ? 'ครบจำนวนแล้ว' : 'คลิกเพื่อสแกน'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                        {scannedCount} <span className="text-sm font-normal text-slate-400">/ {totalCount}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                    className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};
