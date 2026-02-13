import React, { useState } from "react";
import {
    Banknote,
    Wallet,
    PiggyBank,
    Building2,
    CircleDollarSign,
    LayoutDashboard,
} from "lucide-react";
import { CashBookMobile } from "./CashBookMobile";
import LoansManager from "./LoansManager";
import FixedAssetsManager from "./FixedAssetsManager";
import CapitalManager from "./CapitalManager";
import CombinedFinance from "./CombinedFinance";

type Tab = "combined" | "cashbook" | "loans" | "assets" | "capital";

export const FinanceManagerMobile: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>("combined");

    const tabs = [
        { key: "combined" as const, label: "Tổng hợp", icon: LayoutDashboard },
        { key: "cashbook" as const as const, label: "Sổ quỹ", icon: Wallet },
        { key: "loans" as const, label: "Vay & Nợ", icon: Banknote },
        { key: "assets" as const, label: "TSCĐ", icon: Building2 },
        { key: "capital" as const, label: "Vốn", icon: CircleDollarSign },
    ];

    return (
        <div className="md:hidden min-h-screen bg-[#151521] text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#151521]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-blue-500" />
                    Tài chính
                </h2>
            </div>

            {/* Tabs */}
            <div className="px-4 py-3 sticky top-[53px] z-10 bg-[#151521]">
                <div className="flex bg-[#1e1e2d] p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as Tab)}
                            className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${activeTab === tab.key
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="h-full">
                {activeTab === "combined" && <CombinedFinance />}
                {activeTab === "cashbook" && <CashBookMobile />}
                {activeTab === "loans" && <LoansManager />}
                {activeTab === "assets" && <FixedAssetsManager />}
                {activeTab === "capital" && <CapitalManager />}
            </div>
        </div>
    );
};
