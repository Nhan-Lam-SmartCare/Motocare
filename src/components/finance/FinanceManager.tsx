import React, { useState } from "react";
import CashBook from "./CashBook";
import LoansManager from "./LoansManager";

type Tab = "cashbook" | "loans";

const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("cashbook");

  return (
    <div className="space-y-6">
      {/* Header with Toggle Buttons */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-lg shadow-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              🏦 Quản lý Tài chính
            </h1>
            <p className="text-slate-300">
              Quản lý sổ quỹ, khoản vay và các giao dịch tài chính
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("cashbook")}
              className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
                activeTab === "cashbook"
                  ? "bg-blue-600 text-white shadow-blue-500/50 scale-105"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              💰 Sổ quỹ
            </button>
            <button
              onClick={() => setActiveTab("loans")}
              className={`px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
                activeTab === "loans"
                  ? "bg-cyan-600 text-white shadow-cyan-500/50 scale-105"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              💳 Khoản vay
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "cashbook" && <CashBook />}
        {activeTab === "loans" && <LoansManager />}
      </div>
    </div>
  );
};

export default FinanceManager;
