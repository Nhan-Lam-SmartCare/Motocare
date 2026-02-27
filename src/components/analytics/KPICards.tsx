import React, { useState, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, Settings } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface DateRange {
    label: string;
    from: Date;
    to: Date;
}

interface KPICardsProps {
    currentRevenue: number;
    currentProfit: number;
    previousRevenue?: number;
    previousProfit?: number;
    dateRange: DateRange;
}

const KPICards: React.FC<KPICardsProps> = ({
    currentRevenue,
    currentProfit,
    previousRevenue = 0,
    previousProfit = 0,
    dateRange
}) => {
    // Default goals if not set
    const DEFAULT_REVENUE_GOAL = 150000000;
    const DEFAULT_PROFIT_GOAL = 50000000; // Default profit goal

    const [revenueGoal, setRevenueGoal] = useState<number>(DEFAULT_REVENUE_GOAL);
    const [profitGoal, setProfitGoal] = useState<number>(DEFAULT_PROFIT_GOAL);
    const [isEditing, setIsEditing] = useState(false);

    // Only show Monthly Goal features if "Tháng này" is selected
    const showGoals = dateRange.label === "Tháng này";

    // Load from LocalStorage on mount
    useEffect(() => {
        const savedRevenue = localStorage.getItem("kpi_revenue_target");
        const savedProfit = localStorage.getItem("kpi_profit_target");

        if (savedRevenue) setRevenueGoal(Number(savedRevenue));
        if (savedProfit) setProfitGoal(Number(savedProfit));
    }, []);

    // Save to LocalStorage
    const handleSave = () => {
        localStorage.setItem("kpi_revenue_target", revenueGoal.toString());
        localStorage.setItem("kpi_profit_target", profitGoal.toString());
        setIsEditing(false);
    };

    // Calculations
    const currentMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;

    // Comparison calculations
    const revenueChange = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0 ? 100 : 0;
    // ✅ FIX: Dùng Math.abs(previousProfit) để tính đúng khi kỳ trước bị lỗ (< 0)
    const profitChange = previousProfit !== 0
        ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100
        : currentProfit > 0 ? 100 : 0;

    let revenueProgress = 0;
    let profitProgress = 0;
    let daysLeft = 0;
    let expectedProgress = 0;
    let isRevenueBehind = false;
    let isProfitBehind = false;
    let dailyRevenueNeeded = 0;
    let dailyProfitNeeded = 0;

    if (showGoals) {
        // Revenue Progress
        revenueProgress = Math.min((currentRevenue / revenueGoal) * 100, 100);

        // Profit Progress
        profitProgress = Math.min((currentProfit / profitGoal) * 100, 100);

        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        daysLeft = daysInMonth - currentDay;

        expectedProgress = (currentDay / daysInMonth) * 100;
        isRevenueBehind = revenueProgress < expectedProgress - 5; // Behind by >5%
        isProfitBehind = profitProgress < expectedProgress - 5;

        // Daily run rate needed
        const remainingRevenue = Math.max(0, revenueGoal - currentRevenue);
        dailyRevenueNeeded = daysLeft > 0 ? remainingRevenue / daysLeft : 0;

        const remainingProfit = Math.max(0, profitGoal - currentProfit);
        dailyProfitNeeded = daysLeft > 0 ? remainingProfit / daysLeft : 0;
    }

    // Comparison indicator component
    const ComparisonBadge = ({ change, label = "vs kỳ trước" }: { change: number; label?: string }) => {
        if (change === 0) return null;
        const isPositive = change > 0;
        return (
            <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${isPositive
                ? 'bg-green-500/20 text-green-200'
                : 'bg-red-500/20 text-red-200'
                }`}>
                {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                ) : (
                    <TrendingDown className="w-3 h-3" />
                )}
                <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* Revenue Goal Card */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-800 dark:text-white">
                    <Target size={80} />
                </div>

                <div className="flex justify-between items-start z-10 relative">
                    <div>
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                            <Target size={16} className="text-blue-500" />
                            {showGoals ? "Mục tiêu Doanh thu Tháng" : `Doanh thu (${dateRange.label})`}
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(currentRevenue)}</div>

                        {showGoals ? (
                            <div className="text-xs text-slate-500 mt-1">
                                /{formatCurrency(revenueGoal)}
                                <span className="ml-1 opacity-75">({revenueProgress.toFixed(1)}%)</span>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <ComparisonBadge change={revenueChange} />
                            </div>
                        )}
                    </div>
                    {showGoals && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Settings size={16} />
                        </button>
                    )}
                </div>

                {/* Progress Bar (Only show if showGoals) */}
                {showGoals && (
                    <div className="mt-4 z-10 relative">
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isRevenueBehind ? 'bg-amber-400' : 'bg-blue-500'}`}
                                style={{ width: `${revenueProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {showGoals && (
                    <div className="mt-3 flex items-center justify-between z-10 relative text-xs text-slate-500 dark:text-slate-400">
                        <div>
                            {daysLeft > 0 ? (
                                <span>Cần {formatCurrency(dailyRevenueNeeded)}/ngày</span>
                            ) : (
                                <span>Đã hết tháng</span>
                            )}
                        </div>
                        <div className="flex items-center">
                            {isRevenueBehind ? (
                                <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
                                    <TrendingUp size={12} className="mr-1" />
                                    Chậm tiến độ
                                </span>
                            ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">Đúng tiến độ</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Profit Goal Card (Amount) */}
            <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-700 border-t-2 border-t-emerald-500 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-800 dark:text-white">
                    <TrendingUp size={80} />
                </div>

                {isEditing ? (
                    <div className="z-10 relative bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold mb-3 text-slate-800 dark:text-white">Thiết lập mục tiêu (Tháng)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs mb-1 block text-slate-500">Doanh thu</label>
                                <input
                                    type="number"
                                    value={revenueGoal}
                                    onChange={(e) => setRevenueGoal(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded px-2 py-1.5 text-sm font-semibold"
                                />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block text-slate-500">Lợi nhuận</label>
                                <input
                                    type="number"
                                    value={profitGoal}
                                    onChange={(e) => setProfitGoal(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded px-2 py-1.5 text-sm font-semibold"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded text-xs hover:bg-emerald-700 transition"
                                >
                                    Lưu lại
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-1.5 rounded text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start z-10 relative">
                            <div>
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                                    <TrendingUp size={16} className="text-emerald-500" />
                                    {showGoals ? "Mục tiêu Lợi nhuận Tháng" : `Lợi nhuận (${dateRange.label})`}
                                </div>
                                <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(currentProfit)}</div>
                                {showGoals ? (
                                    <div className="text-xs text-slate-500 mt-1">
                                        /{formatCurrency(profitGoal)}
                                        <span className="ml-1 opacity-75">({profitProgress.toFixed(1)}%)</span>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <ComparisonBadge change={profitChange} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {showGoals && (
                            <div className="mt-4 z-10 relative">
                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${isProfitBehind ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                        style={{ width: `${profitProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {showGoals && (
                            <div className="mt-3 flex items-center justify-between z-10 relative text-xs text-slate-500 dark:text-slate-400">
                                <div>
                                    {daysLeft > 0 ? (
                                        <span>Cần {formatCurrency(dailyProfitNeeded)}/ngày</span>
                                    ) : (
                                        <span>Đã hết tháng</span>
                                    )}
                                </div>
                                <div className="flex items-center">
                                    <span>Margin: {currentMargin.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}
                        {!showGoals && (
                            <div className="mt-3 flex items-center justify-between z-10 relative text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center">
                                    <span>Margin: {currentMargin.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default KPICards;

