import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Capital } from "../../types";
import { PlusIcon } from "../Icons";
import { showToast } from "../../utils/toast";
import { useAppContext } from "../../contexts/AppContext";
import {
  useCapitalRepo,
  useCreateCapitalRepo,
  useUpdateCapitalRepo,
  useDeleteCapitalRepo,
} from "../../hooks/useCapitalRepository";

const CapitalManager: React.FC = () => {
  const { currentBranchId } = useAppContext();

  // Fetch capitals from database
  const { data: capitals = [], isLoading } = useCapitalRepo();
  const createMutation = useCreateCapitalRepo();
  const updateMutation = useUpdateCapitalRepo();
  const deleteMutation = useDeleteCapitalRepo();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCapital, setEditingCapital] = useState<Capital | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // Calculate summary
  const summary = useMemo(() => {
    const totalCapital = capitals.reduce((sum, c) => sum + c.amount, 0);
    const ownerCapital = capitals
      .filter((c) => c.type === "owner")
      .reduce((sum, c) => sum + c.amount, 0);
    const investorCapital = capitals
      .filter((c) => c.type === "investor")
      .reduce((sum, c) => sum + c.amount, 0);
    const loanCapital = capitals
      .filter((c) => c.type === "loan")
      .reduce((sum, c) => sum + c.amount, 0);

    return { totalCapital, ownerCapital, investorCapital, loanCapital };
  }, [capitals]);

  // Filter capitals
  const filteredCapitals = useMemo(() => {
    if (filterType === "all") return capitals;
    return capitals.filter((c) => c.type === filterType);
  }, [capitals, filterType]);

  const handleAddCapital = async (
    capital: Omit<Capital, "id" | "created_at">
  ) => {
    try {
      await createMutation.mutateAsync({
        ...capital,
        branchId: currentBranchId,
      });
      showToast.success("Đã thêm nguồn vốn");
      setShowAddModal(false);
    } catch (error: any) {
      showToast.error(error.message || "Không thể thêm nguồn vốn");
    }
  };

  const handleEditCapital = async (updates: Partial<Capital>) => {
    if (!editingCapital) return;
    try {
      await updateMutation.mutateAsync({
        id: editingCapital.id,
        updates,
      });
      showToast.success("Đã cập nhật nguồn vốn");
      setShowEditModal(false);
      setEditingCapital(null);
    } catch (error: any) {
      showToast.error(error.message || "Không thể cập nhật nguồn vốn");
    }
  };

  const handleDeleteCapital = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa nguồn vốn này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Đã xóa nguồn vốn");
      } catch (error: any) {
        showToast.error(error.message || "Không thể xóa nguồn vốn");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Vốn đầu tư
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý vốn chủ sở hữu, vốn đầu tư và vốn vay
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Thêm nguồn vốn</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-3 md:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-purple-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Tổng vốn
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.totalCapital)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Vốn chủ
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.ownerCapital)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-green-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Vốn đầu tư
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.investorCapital)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-orange-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Vốn vay
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.loanCapital)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Loại nguồn vốn:
            </span>
            <div className="flex gap-2">
              {[
                { value: "all", label: "Tất cả" },
                { value: "owner", label: "Vốn chủ" },
                { value: "investor", label: "Đầu tư" },
                { value: "loan", label: "Vốn vay" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === option.value
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capitals List */}
        {filteredCapitals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            {capitals.length === 0
              ? "Chưa có nguồn vốn nào"
              : "Không tìm thấy nguồn vốn phù hợp"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCapitals.map((capital) => (
              <CapitalCard
                key={capital.id}
                capital={capital}
                onEdit={() => {
                  setEditingCapital(capital);
                  setShowEditModal(true);
                }}
                onDelete={() => handleDeleteCapital(capital.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <CapitalModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCapital}
          branchId={currentBranchId}
        />
      )}

      {showEditModal && editingCapital && (
        <CapitalModal
          capital={editingCapital}
          onClose={() => {
            setShowEditModal(false);
            setEditingCapital(null);
          }}
          onSave={handleEditCapital}
          branchId={currentBranchId}
        />
      )}
    </div>
  );
};

// Capital Card Component
const CapitalCard: React.FC<{
  capital: Capital;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ capital, onEdit, onDelete }) => {
  const getTypeInfo = (type: string) => {
    const info: Record<string, { label: string; color: string; icon: string }> =
    {
      owner: {
        label: "Vốn chủ sở hữu",
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: "👤",
      },
      investor: {
        label: "Vốn đầu tư",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: "💼",
      },
      loan: {
        label: "Vốn vay",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        icon: "🏦",
      },
    };
    return info[type] || info.owner;
  };

  const typeInfo = getTypeInfo(capital.type);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {capital.sourceName}
              </h3>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color} mt-1`}
              >
                {typeInfo.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ✏️ Sửa
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🗑️ Xóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Số tiền
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(capital.amount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Ngày nhận
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatDate(new Date(capital.date))}
          </div>
        </div>
      </div>

      {/* Interest Information */}
      {(capital.type === "investor" || capital.type === "loan") &&
        capital.interestRate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Lãi suất
              </div>
              <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                {capital.interestRate}%/năm
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Loại lãi
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {capital.interestType === "simple" ? "Lãi đơn" : "Lãi kép"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Kỳ trả lãi
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {capital.paymentFrequency === "monthly"
                  ? "Hàng tháng"
                  : capital.paymentFrequency === "quarterly"
                    ? "Hàng quý"
                    : "Hàng năm"}
              </div>
            </div>
            {capital.maturityDate && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Đến hạn
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatDate(new Date(capital.maturityDate))}
                </div>
              </div>
            )}
          </div>
        )}

      {capital.notes && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Ghi chú
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {capital.notes}
          </p>
        </div>
      )}
    </div>
  );
};

// Capital Modal Component
const CapitalModal: React.FC<{
  capital?: Capital;
  onClose: () => void;
  onSave: (capital: any) => void;
  branchId: string;
}> = ({ capital, onClose, onSave, branchId }) => {
  const [type, setType] = useState<Capital["type"]>(capital?.type || "owner");
  const [sourceName, setSourceName] = useState(capital?.sourceName || "");
  const [amount, setAmount] = useState(capital?.amount.toString() || "0");
  const [date, setDate] = useState(
    capital?.date.split("T")[0] || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(capital?.notes || "");

  // Interest fields
  const [interestRate, setInterestRate] = useState(
    capital?.interestRate?.toString() || "0"
  );
  const [interestType, setInterestType] = useState<"simple" | "compound">(
    capital?.interestType || "simple"
  );
  const [paymentFrequency, setPaymentFrequency] = useState<
    "monthly" | "quarterly" | "yearly"
  >(capital?.paymentFrequency || "monthly");
  const [maturityDate, setMaturityDate] = useState(
    capital?.maturityDate?.split("T")[0] || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceName.trim()) {
      showToast.error("Vui lòng nhập tên nguồn vốn");
      return;
    }

    const capitalData: any = {
      type,
      sourceName: sourceName.trim(),
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      branchId,
    };

    // Add interest fields for investor and loan types
    if (type === "investor" || type === "loan") {
      capitalData.interestRate = parseFloat(interestRate);
      capitalData.interestType = interestType;
      capitalData.paymentFrequency = paymentFrequency;
      if (maturityDate) {
        capitalData.maturityDate = new Date(maturityDate).toISOString();
      }
    }

    onSave(capitalData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {capital ? "Chỉnh sửa nguồn vốn" : "Thêm nguồn vốn"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Loại nguồn vốn *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "owner", label: "👤 Vốn chủ", color: "blue" },
                { value: "investor", label: "💼 Đầu tư", color: "green" },
                { value: "loan", label: "🏦 Vay", color: "orange" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value as Capital["type"])}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${type === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20 text-${option.color}-700 dark:text-${option.color}-300`
                      : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tên nguồn vốn *
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder={
                type === "owner"
                  ? "VD: Vốn chủ - Nguyễn Văn A"
                  : type === "investor"
                    ? "VD: Nhà đầu tư ABC"
                    : "VD: Ngân hàng Vietcombank"
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Số tiền *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Ngày nhận *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Interest Rate Fields - Only for investor and loan */}
          {(type === "investor" || type === "loan") && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border-2 border-orange-200 dark:border-orange-800 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📊</span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Thông tin lãi suất
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Lãi suất (%/năm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Loại lãi
                  </label>
                  <select
                    value={interestType}
                    onChange={(e) =>
                      setInterestType(e.target.value as "simple" | "compound")
                    }
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="simple">Lãi đơn</option>
                    <option value="compound">Lãi kép</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Kỳ trả lãi
                  </label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="monthly">Hàng tháng</option>
                    <option value="quarterly">Hàng quý</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ngày đến hạn
                  </label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Thêm ghi chú về nguồn vốn..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              {capital ? "Cập nhật" : "Thêm nguồn vốn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CapitalManager;
