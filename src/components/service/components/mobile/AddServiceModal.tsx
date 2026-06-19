import React, { useState } from "react";
import { X, Wrench } from "lucide-react";
import { NumberInput } from "../../../common/NumberInput";
import { formatCurrency } from "../../../../utils/format";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddService: (service: {
    name: string;
    costPrice: number;
    sellingPrice: number;
    quantity: number;
    isFree?: boolean;
  }) => void;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onAddService,
}) => {
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCost, setNewServiceCost] = useState(0);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceQuantity, setNewServiceQuantity] = useState(1);

  const handleAdd = () => {
    if (!newServiceName.trim()) return;
    onAddService({
      name: newServiceName.trim(),
      costPrice: newServiceCost,
      sellingPrice: newServicePrice,
      quantity: newServiceQuantity,
    });
    setNewServiceName("");
    setNewServiceCost(0);
    setNewServicePrice(0);
    setNewServiceQuantity(1);
    onClose();
  };

  const handleCancel = () => {
    setNewServiceName("");
    setNewServiceCost(0);
    setNewServicePrice(0);
    setNewServiceQuantity(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-end md:items-center md:justify-center modal-bottom-safe">
      <div className="w-full md:max-w-md bg-white dark:bg-[#1e1e2d] rounded-t-3xl md:rounded-2xl overflow-hidden transition-colors shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Wrench className="w-4.5 h-4.5 text-orange-500" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-sm">
              Thêm dịch vụ gia công
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content - Compact */}
        <div className="p-4 space-y-4">
          {/* Service Name with inline Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Tên công việc
              </label>
              {/* Mini Quantity Stepper */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setNewServiceQuantity(Math.max(1, newServiceQuantity - 1))}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white text-sm font-bold rounded transition-colors"
                >
                  −
                </button>
                <span className="w-5 text-center text-slate-900 dark:text-white text-xs font-bold">
                  {newServiceQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setNewServiceQuantity(newServiceQuantity + 1)}
                  className="w-6 h-6 flex items-center justify-center text-orange-500 hover:text-orange-600 text-sm font-bold rounded transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="VD: Hàn yếm, Sơn xe, Thay lọc gió..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {/* Price Section - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cost Price (smaller, less emphasis) */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Giá vốn
              </label>
              <div className="relative">
                <NumberInput
                  value={newServiceCost}
                  onChange={(val: number) => {
                    const cost = Math.max(0, val);
                    setNewServiceCost(cost);
                    if (cost > 0) {
                      setNewServicePrice(Math.round(cost * 1.4));
                    }
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2.5 pr-7 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">đ</span>
              </div>
            </div>

            {/* Selling Price (highlighted) */}
            <div>
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1.5 block">
                Đơn giá bán ⭐
              </label>
              <div className="relative">
                <NumberInput
                  value={newServicePrice}
                  onChange={(val: number) => setNewServicePrice(val)}
                  allowNegative={true}
                  placeholder="0"
                  className="w-full px-3 py-2.5 pr-7 bg-orange-500/5 dark:bg-orange-500/10 border-2 border-orange-500/50 rounded-xl text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 text-xs font-bold">đ</span>
              </div>
            </div>
          </div>

          {/* Total - Summary Card */}
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-3.5 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Thành tiền:</span>
                {newServiceQuantity > 1 && (
                  <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    ×{newServiceQuantity}
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-orange-500">
                {formatCurrency(newServicePrice * newServiceQuantity)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4 pt-0">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newServiceName.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
          >
            ✓ Thêm vào phiếu
          </button>
        </div>
      </div>
    </div>
  );
};
