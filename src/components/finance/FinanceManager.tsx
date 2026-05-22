import React, { useState } from "react";
import {
  Banknote,
  Wallet,
  PiggyBank,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import CashBook from "./CashBook";
import LoansManager from "./LoansManager";
import FixedAssetsManager from "./FixedAssetsManager";
import CapitalManager from "./CapitalManager";
import CombinedFinance from "./CombinedFinance";
import { FinanceManagerMobile } from "./FinanceManagerMobile";
import { useAuth } from "../../contexts/AuthContext";
import { canDo } from "../../utils/permissions";

type Tab = "combined" | "cashbook" | "loans" | "assets" | "capital";

type TabConfig = {
  label: string;
  Icon: LucideIcon;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
};

const TAB_CONFIGS: Record<Tab, TabConfig> = {
  combined: {
    label: "Tổng hợp",
    Icon: LayoutDashboard,
    activeClass:
      "text-slate-900 dark:text-white border-b-2 border-blue-500 bg-transparent rounded-none",
    inactiveClass:
      "text-slate-500 dark:text-slate-400 border-b-2 border-transparent bg-transparent hover:text-slate-700 dark:hover:text-slate-300 rounded-none",
    dotClass: "bg-blue-500",
  },
  cashbook: {
    label: "Sổ quỹ",
    Icon: Wallet,
    activeClass:
      "text-slate-900 dark:text-white border-b-2 border-blue-500 bg-transparent rounded-none",
    inactiveClass:
      "text-slate-500 dark:text-slate-400 border-b-2 border-transparent bg-transparent hover:text-slate-700 dark:hover:text-slate-300 rounded-none",
    dotClass: "bg-blue-500",
  },
  loans: {
    label: "Khoản vay",
    Icon: Banknote,
    activeClass:
      "text-slate-900 dark:text-white border-b-2 border-blue-500 bg-transparent rounded-none",
    inactiveClass:
      "text-slate-500 dark:text-slate-400 border-b-2 border-transparent bg-transparent hover:text-slate-700 dark:hover:text-slate-300 rounded-none",
    dotClass: "bg-blue-500",
  },
  assets: {
    label: "TSCĐ",
    Icon: Building2,
    activeClass:
      "text-slate-900 dark:text-white border-b-2 border-blue-500 bg-transparent rounded-none",
    inactiveClass:
      "text-slate-500 dark:text-slate-400 border-b-2 border-transparent bg-transparent hover:text-slate-700 dark:hover:text-slate-300 rounded-none",
    dotClass: "bg-blue-500",
  },
  capital: {
    label: "Vốn",
    Icon: CircleDollarSign,
    activeClass:
      "text-slate-900 dark:text-white border-b-2 border-blue-500 bg-transparent rounded-none",
    inactiveClass:
      "text-slate-500 dark:text-slate-400 border-b-2 border-transparent bg-transparent hover:text-slate-700 dark:hover:text-slate-300 rounded-none",
    dotClass: "bg-blue-500",
  },
};

const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("cashbook");
  const { profile } = useAuth();

  if (!canDo(profile?.role, "finance.view")) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-600 dark:text-slate-300">
        Bạn không có quyền xem tài chính.
      </div>
    );
  }

  return (
    <>
      <FinanceManagerMobile />
      <div className="hidden md:block space-y-6">
        {/* Header with Toggle Buttons - Premium Glass Capsule Dock */}
        <div className="bg-white/80 dark:bg-gradient-to-r dark:from-[#141C30]/85 dark:to-[#0D1222]/95 border border-slate-200 dark:border-[#2B3B5C]/65 shadow-sm dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-2.5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(Object.keys(TAB_CONFIGS) as Tab[]).map((tabKey) => {
              const config = TAB_CONFIGS[tabKey];
              const isActive = activeTab === tabKey;
              const Icon = config.Icon;

              let activeStyle = "";
              let iconStyle = "";

              switch (tabKey) {
                case "combined":
                  activeStyle = "bg-blue-50/50 dark:bg-gradient-to-r dark:from-blue-500/15 dark:to-indigo-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/35 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.2)]";
                  iconStyle = isActive
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400 shadow-sm"
                    : "bg-blue-500/5 text-blue-500 dark:text-blue-400/70 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/15 group-hover:text-blue-700 dark:group-hover:text-blue-300";
                  break;
                case "cashbook":
                  activeStyle = "bg-emerald-50/50 dark:bg-gradient-to-r dark:from-emerald-500/15 dark:to-teal-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-500/35 shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                  iconStyle = isActive
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 shadow-sm"
                    : "bg-emerald-500/5 text-emerald-500 dark:text-emerald-400/70 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/15 group-hover:text-emerald-700 dark:group-hover:text-emerald-300";
                  break;
                case "loans":
                  activeStyle = "bg-rose-50/50 dark:bg-gradient-to-r dark:from-rose-500/15 dark:to-pink-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/35 shadow-sm dark:shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                  iconStyle = isActive
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400 shadow-sm"
                    : "bg-rose-500/5 text-rose-500 dark:text-rose-400/70 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/15 group-hover:text-rose-750 dark:group-hover:text-rose-300";
                  break;
                case "assets":
                  activeStyle = "bg-violet-50/50 dark:bg-gradient-to-r dark:from-violet-500/15 dark:to-purple-500/15 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/35 shadow-sm dark:shadow-[0_0_15px_rgba(139,92,246,0.2)]";
                  iconStyle = isActive
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-500/25 dark:text-violet-400 shadow-sm"
                    : "bg-violet-500/5 text-violet-500 dark:text-violet-400/70 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/15 group-hover:text-violet-700 dark:group-hover:text-violet-300";
                  break;
                case "capital":
                  activeStyle = "bg-amber-50/50 dark:bg-gradient-to-r dark:from-amber-500/15 dark:to-orange-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/35 shadow-sm dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]";
                  iconStyle = isActive
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400 shadow-sm"
                    : "bg-amber-500/5 text-amber-500 dark:text-amber-400/70 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/15 group-hover:text-amber-700 dark:group-hover:text-amber-300";
                  break;
              }

              return (
                <button
                  type="button"
                  key={tabKey}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tabKey)}
                  className={`group px-4 py-2.5 rounded-xl font-extrabold whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 text-xs uppercase tracking-wider border ${
                    isActive
                      ? activeStyle
                      : "bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E293B]/40 border-transparent hover:border-slate-200 dark:hover:border-[#2B3B5C]/30"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${iconStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "combined" && <CombinedFinance />}
          {activeTab === "cashbook" && <CashBook />}
          {activeTab === "loans" && <LoansManager />}
          {activeTab === "assets" && <FixedAssetsManager />}
          {activeTab === "capital" && <CapitalManager />}
        </div>
      </div>
    </>
  );
};

export default FinanceManager;
