import React, { useState } from "react";
import type { WorkOrder } from "../../../../types";
import { NumberInput } from "../../../common/NumberInput";
import { formatCurrency } from "../../../../utils/format";
import { showToast } from "../../../../utils/toast";
import { supabase } from "../../../../supabaseClient";

interface AdditionalService {
  id: string;
  description: string;
  quantity: number;
  price: number;
  costPrice?: number;
  isFree?: boolean;
}

interface AdditionalServicesSectionProps {
  additionalServices: AdditionalService[];
  setAdditionalServices: React.Dispatch<React.SetStateAction<AdditionalService[]>>;
  canEditPriceAndParts: boolean;
  order: WorkOrder;
}

export const AdditionalServicesSection: React.FC<AdditionalServicesSectionProps> = ({
  additionalServices,
  setAdditionalServices,
  canEditPriceAndParts,
  order,
}) => {
  const [newService, setNewService] = useState({
    description: "",
    quantity: 1,
    price: 0,
    costPrice: 0,
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold">4</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Báo giá (Gia công, Đặt hàng)
        </h3>
        {additionalServices.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            {additionalServices.length}
          </span>
        )}
      </div>

      <div className="border border-slate-200/60 dark:border-slate-800/40 rounded-xl overflow-hidden shadow-sm bg-slate-500/[0.01] backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mô tả
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                SL
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Giá nhập
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Đơn giá
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Thành tiền
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                <button
                  type="button"
                  onClick={() => {
                    if (newService.description) {
                      setAdditionalServices([
                        ...additionalServices,
                        { ...newService, id: `SRV-${Date.now()}` },
                      ]);
                      setNewService({
                        description: "",
                        quantity: 1,
                        price: 0,
                        costPrice: 0,
                      });
                    }
                  }}
                  className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-blue-500/10"
                >
                  Thêm
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white/40 dark:bg-slate-900/10">
            {additionalServices.map((service) => (
              <tr key={service.id} className={`hover:bg-slate-500/[0.02] transition-colors ${service.isFree ? 'bg-emerald-500/[0.04]' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    {service.description}
                    {service.isFree && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        🎁 Tặng
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={service.quantity}
                    min="1"
                    onChange={(e) => {
                      const newQty = Math.max(1, Number(e.target.value));
                      setAdditionalServices(
                        additionalServices.map((s) =>
                          s.id === service.id ? { ...s, quantity: newQty } : s
                        )
                      );
                    }}
                    className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-center bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <NumberInput
                    value={service.costPrice ?? 0}
                    onChange={(val) =>
                      setAdditionalServices(
                        additionalServices.map((s) => {
                          if (s.id === service.id) {
                            return {
                              ...s,
                              costPrice: val,
                              price: val ? Math.round(val * 1.4) : s.price,
                            };
                          }
                          return s;
                        })
                      )
                    }
                    disabled={false}
                    className="w-full px-2 py-1 border border-amber-200/50 dark:border-amber-900/40 rounded-lg text-right bg-amber-500/5 text-amber-700 dark:text-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all text-sm"
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <NumberInput
                    value={service.price}
                    onChange={(val) =>
                      setAdditionalServices(
                        additionalServices.map((s) =>
                          s.id === service.id ? { ...s, price: val } : s
                        )
                      )
                    }
                    disabled={!canEditPriceAndParts}
                    className={`w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-right bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm ${
                      !canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    placeholder="0"
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  {service.isFree ? (
                    <div className="flex flex-col items-end">
                      <span className="line-through text-slate-400 dark:text-slate-500 text-xs">
                        {formatCurrency(service.price * service.quantity)}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        Tặng
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-800 dark:text-slate-200">
                      {formatCurrency(service.price * service.quantity)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      title={service.isFree ? "Bỏ tặng" : "Đánh dấu tặng miễn phí"}
                      onClick={() => {
                        setAdditionalServices(
                          additionalServices.map((s) =>
                            s.id === service.id ? { ...s, isFree: !s.isFree } : s
                          )
                        );
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        service.isFree
                          ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                      }`}
                      aria-label={service.isFree ? "Bỏ tặng" : "Tặng miễn phí"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <rect x="3" y="8" width="18" height="4" rx="1" />
                        <path d="M12 8v13" />
                        <path d="M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
                        <path d="M7.5 8a2.5 2.5 0 010-5C9 3 12 8 12 8" />
                        <path d="M16.5 8a2.5 2.5 0 000-5C15 3 12 8 12 8" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const newServices = additionalServices.filter((s) => s.id !== service.id);
                        setAdditionalServices(newServices);

                        if (newServices.length === 0 && order?.id) {
                          try {
                            await supabase
                              .from("work_orders")
                              .update({ additionalservices: null })
                              .eq("id", order.id);
                            showToast.success("Đã xóa phần gia công/đặt hàng");
                          } catch (error) {
                            console.error("[WorkOrderModal] Error clearing additionalServices:", error);
                            showToast.error("Lỗi khi xóa phần gia công/đặt hàng");
                          }
                        }
                      }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                      aria-label="Xóa dịch vụ"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M9 6V4h6v2m-7 4v8m4-8v8m4-8v8" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            <tr className="bg-slate-500/[0.02]">
              <td className="px-4 py-3">
                <input
                  type="text"
                  placeholder="Mô tả..."
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  value={newService.quantity}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      quantity: Number(e.target.value),
                    })
                  }
                  className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-center bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <NumberInput
                  placeholder="0"
                  value={newService.costPrice ?? ""}
                  onChange={(val) => {
                    const newCostPrice = Math.max(0, val);
                    setNewService({
                      ...newService,
                      costPrice: newCostPrice,
                      price: newCostPrice > 0 ? Math.round(newCostPrice * 1.4) : newService.price,
                    });
                  }}
                  className="w-full px-2 py-1 border border-amber-200/50 dark:border-amber-900/40 rounded-lg text-right bg-amber-500/5 text-amber-700 dark:text-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all text-sm"
                />
              </td>
              <td className="px-4 py-3">
                <NumberInput
                  placeholder="0"
                  value={newService.price ?? ""}
                  onChange={(val) =>
                    setNewService({
                      ...newService,
                      price: val,
                    })
                  }
                  allowNegative={true}
                  className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-right bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all text-sm"
                />
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-400 dark:text-slate-500 font-medium">
                {newService.price > 0
                  ? formatCurrency(newService.price * newService.quantity)
                  : "Thành tiền"}
              </td>
              <td className="px-4 py-3 text-center"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
