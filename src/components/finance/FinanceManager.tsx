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
        <div className="bg-gradient-to-r from-[#141C30]/85 to-[#0D1222]/95 border border-[#2B3B5C]/65 shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-2.5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(Object.keys(TAB_CONFIGS) as Tab[]).map((tabKey) => {
              const config = TAB_CONFIGS[tabKey];
              const isActive = activeTab === tabKey;
              const Icon = config.Icon;

              let activeStyle = "";
              let iconStyle = "";

              switch (tabKey) {
                case "combined":
                  activeStyle = "bg-gradient-to-r from-blue-500/15 to-indigo-500/15 text-blue-400 border-blue-500/35 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
                  iconStyle = isActive
                    ? "bg-blue-500/25 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    : "bg-blue-500/5 text-blue-400/70 group-hover:bg-blue-500/15 group-hover:text-blue-300";
                  break;
                case "cashbook":
                  activeStyle = "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-400 border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                  iconStyle = isActive
                    ? "bg-emerald-500/25 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-emerald-500/5 text-emerald-400/70 group-hover:bg-emerald-500/15 group-hover:text-emerald-300";
                  break;
                case "loans":
                  activeStyle = "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-400 border-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                  iconStyle = isActive
                    ? "bg-rose-500/25 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                    : "bg-rose-500/5 text-rose-400/70 group-hover:bg-rose-500/15 group-hover:text-rose-300";
                  break;
                case "assets":
                  activeStyle = "bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-400 border-violet-500/35 shadow-[0_0_15px_rgba(139,92,246,0.2)]";
                  iconStyle = isActive
                    ? "bg-violet-500/25 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                    : "bg-violet-500/5 text-violet-400/70 group-hover:bg-violet-500/15 group-hover:text-violet-300";
                  break;
                case "capital":
                  activeStyle = "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400 border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
                  iconStyle = isActive
                    ? "bg-amber-500/25 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "bg-amber-500/5 text-amber-400/70 group-hover:bg-amber-500/15 group-hover:text-amber-300";
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
                      : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/40 border-transparent hover:border-[#2B3B5C]/30"
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
