// src/components/deals/DealStatusPipeline.tsx
import * as React from "react";

export type PipelineStatus = "completed" | "current" | "waiting";

export type PipelineStep = {
    id: string;
    label: string;
    status: PipelineStatus;
    tooltip?: string;
};

type DealStatusPipelineProps = {
    steps: PipelineStep[];
    title?: string;
    rightStatusText?: string;
};

export const DealStatusPipeline: React.FC<DealStatusPipelineProps> = ({
    steps,
    title = "สถานะดีล",
    rightStatusText,
}) => {
    if (!steps || steps.length === 0) return null;

    // Find current index for progress calculation
    const currentIdx = steps.findIndex((s) => s.status === "current");
    const lastCompletedIdx = steps.reduce(
        (last, s, i) => (s.status === "completed" ? i : last),
        -1
    );
    // If current is found, use it. If not, use last completed.
    const progressIdx = currentIdx !== -1 ? currentIdx : lastCompletedIdx;

    return (
        <div className="w-full mb-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                    {title}
                </span>
                {rightStatusText && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {rightStatusText}
                    </span>
                )}
            </div>

            {/* Segment-based Pipeline */}
            <div className="w-full flex items-center px-2">
                {steps.map((step, index) => {
                    const isCompleted = step.status === "completed";
                    const isCurrent = step.status === "current";
                    const isWaiting = step.status === "waiting";
                    const tooltipText = step.tooltip || step.label;

                    // Dot Styles
                    const dotClasses = [
                        "w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 z-10 relative box-content",
                        isCompleted && "bg-emerald-500 border-emerald-500",
                        isCurrent &&
                        "bg-slate-900 dark:bg-slate-900 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)] scale-110",
                        isWaiting &&
                        "bg-slate-900 dark:bg-slate-900 border-slate-600 dark:border-slate-600",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    const textClass =
                        isCurrent
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : isCompleted
                                ? "text-slate-400 dark:text-slate-500 font-medium"
                                : "text-slate-300 dark:text-slate-600 font-medium";

                    return (
                        <React.Fragment key={step.id}>
                            {/* Line Segment (except for first item) */}
                            {index > 0 && (
                                <div className="flex-1 h-[2px] bg-slate-200 dark:bg-slate-700 relative -mx-1">
                                    <div
                                        className={
                                            "absolute inset-0 transition-all duration-500 " +
                                            (index <= progressIdx ? "bg-emerald-500" : "bg-transparent")
                                        }
                                    />
                                </div>
                            )}

                            {/* Dot & Label Container */}
                            <div className="relative flex flex-col items-center justify-center group">
                                {/* Dot */}
                                <div className={dotClasses} />

                                {/* Tooltip */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 pointer-events-none z-20">
                                    <div className="px-2 py-1 rounded bg-slate-900 text-[10px] text-white shadow-lg whitespace-nowrap">
                                        {tooltipText}
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                    </div>
                                </div>

                                {/* Label */}
                                <span
                                    className={
                                        "absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-wide transition-colors " +
                                        textClass
                                    }
                                >
                                    {step.label}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
