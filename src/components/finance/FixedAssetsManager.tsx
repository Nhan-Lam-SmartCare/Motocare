import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/format";
import type { FixedAsset } from "../../types";
import { PlusIcon } from "../Icons";
import { showToast } from "../../utils/toast";
import { useAppContext } from "../../contexts/AppContext";
import {
  useFixedAssetsRepo,
  useCreateFixedAssetRepo,
  useUpdateFixedAssetRepo,
  useDeleteFixedAssetRepo,
} from "../../hooks/useFixedAssetsRepository";

const FixedAssetsManager: React.FC = () => {
  const { currentBranchId } = useAppContext();

  // Fetch assets from database
  const { data: assets = [], isLoading } = useFixedAssetsRepo();
  const createMutation = useCreateFixedAssetRepo();
  const updateMutation = useUpdateFixedAssetRepo();
  const deleteMutation = useDeleteFixedAssetRepo();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Calculate summary
  const summary = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const currentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const activeAssets = assets.filter((a) => a.status === "active").length;
    const totalDepreciation = totalValue - currentValue;

    return { totalValue, currentValue, activeAssets, totalDepreciation };
  }, [assets]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filterType !== "all" && asset.assetType !== filterType) return false;
      if (filterStatus !== "all" && asset.status !== filterStatus) return false;
      return true;
    });
  }, [assets, filterType, filterStatus]);

  const handleAddAsset = async (
    asset: Omit<FixedAsset, "id" | "created_at">
  ) => {
    try {
      await createMutation.mutateAsync({
        ...asset,
        branchId: currentBranchId,
      });
      showToast.success("Đã thêm tài sản cố định");
      setShowAddModal(false);
    } catch (error: any) {
      showToast.error(error.message || "Không thể thêm tài sản");
    }
  };

  const handleEditAsset = async (updates: Partial<FixedAsset>) => {
    if (!editingAsset) return;
    try {
      await updateMutation.mutateAsync({
        id: editingAsset.id,
        updates,
      });
      showToast.success("Đã cập nhật tài sản");
      setShowEditModal(false);
      setEditingAsset(null);
    } catch (error: any) {
      showToast.error(error.message || "Không thể cập nhật tài sản");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa tài sản này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Đã xóa tài sản");
      } catch (error: any) {
        showToast.error(error.message || "Không thể xóa tài sản");
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
              Tài sản cố định
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý tài sản và theo dõi khấu hao
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Thêm tài sản</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-3 md:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-slate-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Tổng giá trị mua
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.totalValue)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Giá trị hiện tại
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.currentValue)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-orange-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Khấu hao lũy kế
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(summary.totalDepreciation)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-green-500 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              Tài sản đang dùng
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {summary.activeAssets}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Loại:
              </span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="equipment">Thiết bị</option>
                <option value="vehicle">Xe cộ</option>
                <option value="building">Nhà xưởng</option>
                <option value="furniture">Nội thất</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Trạng thái:
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang dùng</option>
                <option value="maintenance">Bảo trì</option>
                <option value="disposed">Đã thanh lý</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assets List */}
        {filteredAssets.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
            {assets.length === 0
              ? "Chưa có tài sản cố định nào"
              : "Không tìm thấy tài sản phù hợp"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={() => {
                  setEditingAsset(asset);
                  setShowEditModal(true);
                }}
                onDelete={() => handleDeleteAsset(asset.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AssetModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddAsset}
          branchId={currentBranchId}
        />
      )}

      {showEditModal && editingAsset && (
        <AssetModal
          asset={editingAsset}
          onClose={() => {
            setShowEditModal(false);
            setEditingAsset(null);
          }}
          onSave={handleEditAsset}
          branchId={currentBranchId}
        />
      )}
    </div>
  );
};

// Asset Card Component
const AssetCard: React.FC<{
  asset: FixedAsset;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ asset, onEdit, onDelete }) => {
  const depreciationPercent =
    ((asset.purchasePrice - asset.currentValue) / asset.purchasePrice) * 100;

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      equipment: "Thiết bị",
      vehicle: "Xe cộ",
      building: "Nhà xưởng",
      furniture: "Nội thất",
      other: "Khác",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      maintenance:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      disposed:
        "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400",
    };
    return colors[status] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Đang dùng",
      maintenance: "Bảo trì",
      disposed: "Đã thanh lý",
    };
    return labels[status] || status;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {asset.name}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {getAssetTypeLabel(asset.assetType)}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                asset.status
              )}`}
            >
              {getStatusLabel(asset.status)}
            </span>
          </div>
          {asset.serialNumber && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Serial: {asset.serialNumber}
            </p>
          )}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Giá mua
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatCurrency(asset.purchasePrice)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Giá trị hiện tại
          </div>
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(asset.currentValue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Khấu hao/năm
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {asset.depreciationRate}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Thời gian SD
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {asset.usefulLife} năm
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Khấu hao: {depreciationPercent.toFixed(1)}%</span>
          <span>Còn lại: {(100 - depreciationPercent).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${depreciationPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Ngày mua: {formatDate(new Date(asset.purchaseDate))}</span>
        {asset.location && <span>Vị trí: {asset.location}</span>}
      </div>
    </div>
  );
};

// Asset Modal Component
const AssetModal: React.FC<{
  asset?: FixedAsset;
  onClose: () => void;
  onSave: (asset: any) => void;
  branchId: string;
}> = ({ asset, onClose, onSave, branchId }) => {
  const [name, setName] = useState(asset?.name || "");
  const [assetType, setAssetType] = useState<FixedAsset["assetType"]>(
    asset?.assetType || "equipment"
  );
  const [purchaseDate, setPurchaseDate] = useState(
    asset?.purchaseDate.split("T")[0] || new Date().toISOString().split("T")[0]
  );
  const [purchasePrice, setPurchasePrice] = useState(
    asset?.purchasePrice.toString() || "0"
  );
  const [depreciationRate, setDepreciationRate] = useState(
    asset?.depreciationRate.toString() || "10"
  );
  const [usefulLife, setUsefulLife] = useState(
    asset?.usefulLife.toString() || "5"
  );
  const [status, setStatus] = useState<FixedAsset["status"]>(
    asset?.status || "active"
  );
  const [location, setLocation] = useState(asset?.location || "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || "");
  const [supplier, setSupplier] = useState(asset?.supplier || "");
  const [warranty, setWarranty] = useState(asset?.warranty || "");
  const [notes, setNotes] = useState(asset?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(purchasePrice);
    const rate = parseFloat(depreciationRate);
    const life = parseFloat(usefulLife);

    // Calculate current value based on straight-line depreciation
    const yearsPassed =
      (new Date().getTime() - new Date(purchaseDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    const annualDepreciation = (price * rate) / 100;
    const totalDepreciation = Math.min(annualDepreciation * yearsPassed, price);
    const currentValue = Math.max(0, price - totalDepreciation);

    const assetData = {
      name,
      assetType,
      purchaseDate: new Date(purchaseDate).toISOString(),
      purchasePrice: price,
      currentValue,
      depreciationRate: rate,
      depreciationMethod: "straight-line" as const,
      usefulLife: life,
      status,
      location,
      serialNumber,
      supplier,
      warranty: warranty ? new Date(warranty).toISOString() : "",
      notes,
      branchId,
    };

    onSave(assetData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {asset ? "Chỉnh sửa tài sản" : "Thêm tài sản cố định"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tên tài sản *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại tài sản *
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="equipment">Thiết bị</option>
                <option value="vehicle">Xe cộ</option>
                <option value="building">Nhà xưởng</option>
                <option value="furniture">Nội thất</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="active">Đang dùng</option>
                <option value="maintenance">Bảo trì</option>
                <option value="disposed">Đã thanh lý</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Ngày mua *
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Giá mua *
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tỷ lệ khấu hao (%/năm) *
              </label>
              <input
                type="number"
                step="0.1"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Thời gian sử dụng (năm) *
              </label>
              <input
                type="number"
                value={usefulLife}
                onChange={(e) => setUsefulLife(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Số Serial
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Vị trí
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nhà cung cấp
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Bảo hành đến
              </label>
              <input
                type="date"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
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
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              {asset ? "Cập nhật" : "Thêm tài sản"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FixedAssetsManager;
