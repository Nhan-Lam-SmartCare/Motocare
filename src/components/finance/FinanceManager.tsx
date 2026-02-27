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
  const [activeTab, setActiveTab] = useState<Tab>("combined");

  return (
    <>
      <FinanceManagerMobile />
      <div className="hidden md:block space-y-6">
        {/* Header with Toggle Buttons */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-0 overflow-hidden">


          <div className="px-4 md:px-6 flex overflow-x-auto no-scrollbar gap-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {(Object.keys(TAB_CONFIGS) as Tab[]).map((tabKey) => {
              const config = TAB_CONFIGS[tabKey];
              const isActive = activeTab === tabKey;
              const Icon = config.Icon;
              return (
                <button
                  type="button"
                  key={tabKey}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tabKey)}
                  className={`py-4 font-bold text-sm transition-all flex items-center justify-center gap-2 relative ${isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-slate-900 dark:text-white" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">{config.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 dark:bg-slate-200 rounded-t-full"></div>
                  )}
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
