import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../../../contexts/AppContext";
import { usePartsRepo } from "../../../hooks/usePartsRepository";
import type { CartItem, Part, Customer, Sale } from "../../../types";
import { formatCurrency, formatDate, formatAnyId } from "../../../utils/format";
import { NumberInput } from "../../common/NumberInput";
import { getCategoryColor } from "../../../utils/categoryColors";
import { showToast } from "../../../utils/toast";
import { PlusIcon, XMarkIcon } from "../../Icons";

export interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: (updatedSale: {
    id: string;
    items: CartItem[];
    customer: { id?: string; name: string; phone?: string };
    paymentMethod: "cash" | "bank";
    discount: number;
  }) => Promise<void>;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSave,
}) => {
  const { customers, upsertCustomer } = useAppContext();
  const { data: repoParts = [] } = usePartsRepo();
  const queryClient = useQueryClient();

  const [editItems, setEditItems] = useState<CartItem[]>([]);
  const [editCustomer, setEditCustomer] = useState({
    id: "",
    name: "",
    phone: "",
  });
  const [editPaymentMethod, setEditPaymentMethod] = useState<"cash" | "bank">(
    "cash"
  );
  const [editDiscount, setEditDiscount] = useState(0);

  // State for adding products
  const [searchPart, setSearchPart] = useState("");
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  // State for adding customers
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Initialize form when sale changes
  useEffect(() => {
    if (sale) {
      setEditItems([...sale.items]);
      setEditCustomer({
        id: sale.customer.id || "",
        name: sale.customer.name,
        phone: sale.customer.phone || "",
      });
      setCustomerSearchText(sale.customer.name);
      setEditPaymentMethod(sale.paymentMethod);
      setEditDiscount(sale.discount || 0);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const subtotal = editItems.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
    0
  );
  const total = subtotal - editDiscount;

  // Filter parts for search
  const availableParts = repoParts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchPart.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchPart.toLowerCase())
  );

  // Filter customers for search (by name, phone, or license plate)
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearchText.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      (c.vehicles &&
        c.vehicles.some((v: any) => v.licensePlate?.toLowerCase().includes(q)))
    );
  });

  const handleAddPart = (part: Part) => {
    // Check if current branch has stock
    const branchStock =
      typeof part.stock === "object"
        ? part.stock[sale.branchId] || 0
        : part.stock;

    // Get selling price for current branch
    const branchPrice =
      typeof part.retailPrice === "object"
        ? part.retailPrice[sale.branchId] || 0
        : part.retailPrice || 0;

    const existing = editItems.find((i) => i.partId === part.id);
    if (existing) {
      // Increase quantity
      setEditItems(
        editItems.map((i) =>
          i.partId === part.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      // Add new item
      setEditItems([
        ...editItems,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          category: part.category || "",
          quantity: 1,
          sellingPrice: branchPrice,
          stockSnapshot: typeof branchStock === "number" ? branchStock : 0,
        },
      ]);
    }
    setSearchPart("");
    setShowPartDropdown(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setEditCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "",
    });
    setCustomerSearchText(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      showToast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    try {
      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        name: newCustomerName,
        phone: newCustomerPhone || undefined,
        email: "",
        created_at: new Date().toISOString(),
      };

      await upsertCustomer(newCustomer);

      setEditCustomer({
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone || "",
      });
      setCustomerSearchText(newCustomer.name);
      setShowCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      showToast.success("Thêm khách hàng thành công");
    } catch (error) {
      console.error("Error adding customer:", error);
      showToast.error("Lỗi khi thêm khách hàng");
    }
  };

  const handleUpdateQuantity = (partId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setEditItems(editItems.filter((i) => i.partId !== partId));
    } else {
      setEditItems(
        editItems.map((i) =>
          i.partId === partId ? { ...i, quantity: newQuantity } : i
        )
      );
    }
  };

  const handleUpdatePrice = (partId: string, newPrice: number) => {
    setEditItems(
      editItems.map((i) =>
        i.partId === partId ? { ...i, sellingPrice: newPrice } : i
      )
    );
  };

  const handleRemoveItem = (partId: string) => {
    setEditItems(editItems.filter((i) => i.partId !== partId));
  };

  const handleSave = async () => {
    if (editItems.length === 0) {
      showToast.error("Vui lòng có ít nhất một sản phẩm");
      return;
    }
    if (!editCustomer.name) {
      showToast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    try {
      await onSave({
        id: sale.id,
        items: editItems,
        customer: editCustomer,
        paymentMethod: editPaymentMethod,
        discount: editDiscount,
      });
      // Success toast will be shown by onSave callback
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
      onClose();
    } catch (error) {
      console.error("Error saving sale:", error);
      // Error toast will be shown by onSave callback
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Chỉnh Sửa Đơn Hàng</h2>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{sale.sale_code || formatAnyId(sale.id)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Section: Time & Employee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Thời gian</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatDate(new Date(sale.date), false)} {new Date(sale.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Nhân viên</label>
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                {(sale as any).username || sale.userName}
              </div>
            </div>
          </div>

          {/* Section: Customer */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Thông tin khách hàng</label>
            {!showCustomerForm ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={customerSearchText}
                    onChange={(e) => {
                      setCustomerSearchText(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Tìm kiếm khách hàng..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 overflow-x-hidden scrollbar-thin">
                      {filteredCustomers.slice(0, 10).map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                        >
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</div>
                          {customer.phone && <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>{customer.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowCustomerForm(true)}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 font-bold text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Mới
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-3 animate-in zoom-in-95 duration-200">
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Tên khách hàng"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddNewCustomer} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700">Lưu</button>
                  <button onClick={() => { setShowCustomerForm(false); setNewCustomerName(""); setNewCustomerPhone(""); }} className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm">Hủy</button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Products */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Chi tiết hàng hóa</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <input
                type="text"
                value={searchPart}
                onChange={(e) => { setSearchPart(e.target.value); setShowPartDropdown(true); }}
                onFocus={() => setShowPartDropdown(true)}
                placeholder="Tìm và thêm hàng hóa..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {showPartDropdown && searchPart && availableParts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-20 scrollbar-thin">
                  {availableParts.slice(0, 10).map((part) => (
                    <button
                      key={part.id}
                      onClick={() => handleAddPart(part)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{part.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded uppercase">{part.sku}</span>
                        {part.category && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(part.category).bg} ${getCategoryColor(part.category).text}`}>{part.category}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-3 text-left">Hàng hóa</th>
                    <th className="px-2 py-3 text-center w-20">SL</th>
                    <th className="px-4 py-3 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-right">Tổng</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {editItems.map((item) => (
                    <tr key={item.partId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{item.partName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5 uppercase tracking-tighter">{item.sku}</div>
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.partId, parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <NumberInput
                          value={item.sellingPrice}
                          onChange={(val) => handleUpdatePrice(item.partId, val)}
                          className="w-full py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-slate-900 dark:text-white px-2"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.quantity * item.sellingPrice)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={() => handleRemoveItem(item.partId)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><XMarkIcon className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {editItems.length === 0 && <div className="py-12 text-center text-slate-400 text-xs italic font-medium">Chưa có sản phẩm nào trong danh sách</div>}
          </div>

          {/* Section: Payment Recap */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Hình thức</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditPaymentMethod("cash")} className={`flex-1 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all ${editPaymentMethod === 'cash' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Tiền mặt</button>
                  <button onClick={() => setEditPaymentMethod("bank")} className={`flex-1 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all ${editPaymentMethod === 'bank' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Chuyển khoản</button>
                </div>
              </div>
              <div className="text-right">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Giảm giá</label>
                <div className="relative inline-block w-full">
                  <NumberInput value={editDiscount} onChange={setEditDiscount} className="w-full bg-slate-800 border-0 rounded-xl text-right font-black text-rose-400 py-1.5 pr-2 outline-none focus:ring-1 focus:ring-rose-500/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Tổng phải thu</span>
              <span className="text-3xl font-black text-white tracking-tight">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            ĐÓNG
          </button>
          <button
            onClick={handleSave}
            disabled={editItems.length === 0}
            className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:translate-y-0"
          >
            LƯU THAY ĐỔI
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSaleModal;
