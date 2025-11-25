import React, { useState } from "react";
import {
  Banknote,
  Wallet,
  PiggyBank,
  Building2,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";
import CashBook from "./CashBook";
import LoansManager from "./LoansManager";
import FixedAssetsManager from "./FixedAssetsManager";
import CapitalManager from "./CapitalManager";

type Tab = "cashbook" | "loans" | "assets" | "capital";

type TabConfig = {
  label: string;
  Icon: LucideIcon;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
};

const TAB_CONFIGS: Record<Tab, TabConfig> = {
  cashbook: {
    label: "Sổ quỹ",
    Icon: Wallet,
    activeClass:
      "bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-lg shadow-blue-500/40",
    inactiveClass:
      "bg-white/90 dark:bg-slate-900/60 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:bg-blue-50/80 dark:hover:bg-blue-900/20",
    dotClass: "bg-blue-400",
  },
  loans: {
    label: "Khoản vay",
    Icon: Banknote,
    activeClass:
      "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-transparent shadow-lg shadow-cyan-500/40",
    inactiveClass:
      "bg-white/90 dark:bg-slate-900/60 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-50/80 dark:hover:bg-cyan-900/20",
    dotClass: "bg-cyan-400",
  },
  assets: {
    label: "TSCĐ",
    Icon: Building2,
    activeClass:
      "bg-gradient-to-r from-emerald-500 to-lime-500 text-white border-transparent shadow-lg shadow-emerald-500/40",
    inactiveClass:
      "bg-white/90 dark:bg-slate-900/60 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/20",
    dotClass: "bg-emerald-400",
  },
  capital: {
    label: "Vốn",
    Icon: CircleDollarSign,
    activeClass:
      "bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white border-transparent shadow-lg shadow-fuchsia-500/40",
    inactiveClass:
      "bg-white/90 dark:bg-slate-900/60 text-fuchsia-700 dark:text-fuchsia-200 border border-fuchsia-200 dark:border-fuchsia-800 hover:bg-fuchsia-50/80 dark:hover:bg-fuchsia-900/20",
    dotClass: "bg-fuchsia-400",
  },
};

const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("cashbook");

  return (
    <div className="space-y-6">
      {/* Header with Toggle Buttons */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-lg border border-primary-border p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-primary-text mb-2">
              <PiggyBank className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Quản lý Tài chính
            </h1>
            <p className="text-secondary-text">
              Quản lý sổ quỹ, khoản vay và các giao dịch tài chính
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
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
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border ${
                      isActive
                        ? `${config.activeClass} scale-[1.03]`
                        : config.inactiveClass
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? "bg-white/90" : config.dotClass
                      }`}
                    ></span>
                    <Icon className="w-4 h-4" />
                    <span className="whitespace-nowrap">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "cashbook" && <CashBook />}
        {activeTab === "loans" && <LoansManager />}
        {activeTab === "assets" && <FixedAssetsManager />}
        {activeTab === "capital" && <CapitalManager />}
      </div>
    </div>
  );
};

export default FinanceManager;
