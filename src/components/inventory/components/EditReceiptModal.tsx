import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useSuppliers } from "../../../hooks/useSuppliers";
import { showToast } from "../../../utils/toast";
import { formatCurrency } from "../../../utils/format";
import FormattedNumberInput from "../../common/FormattedNumberInput";
import type { Part, InventoryTransaction } from "../../../types";
const EditReceiptModal: React.FC<{
  receipt: {
    receiptCode: string;
    date: Date;
    supplier: string;
    items: InventoryTransaction[];
    total: number;
  };
  onClose: () => void;
  onSave: (data: any) => void;
  currentBranchId: string;
}> = ({ receipt, onClose, onSave, currentBranchId }) => {
  const [supplier, setSupplier] = useState(receipt.supplier);
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierSearchTerm, setSupplierSearchTerm] = useState(
    receipt.supplier
  );
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierModalMode, setSupplierModalMode] = useState<"add" | "edit">(
    "add"
  );
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Fetch suppliers from database
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm) return allSuppliers;
    const q = supplierSearchTerm.toLowerCase();
    return allSuppliers.filter((s: any) => s.name.toLowerCase().includes(q));
  }, [allSuppliers, supplierSearchTerm]);

  const [items, setItems] = useState(
    receipt.items.map((item) => ({
      id: item.id,
      partName: item.partName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.quantity * (item.unitPrice || 0),
      notes: item.notes || "",
    }))
  );
  const [payments, setPayments] = useState([
    {
      time: "15:31",
      date: receipt.date,
      payer: "Xu�n Nhan",
      cashier: "(Ti�n m�t)",
      amount: receipt.total,
    },
  ]);
  const [isPaid, setIsPaid] = useState(true);

  // Extract phone from notes if available
  React.useEffect(() => {
    const firstItem = receipt.items[0];
    if (firstItem?.notes?.includes("Phone:")) {
      const phone = firstItem.notes.split("Phone:")[1]?.split("NV:")[0]?.trim();
      if (phone) setSupplierPhone(phone);
    }
  }, [receipt.items]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".supplier-dropdown-container")) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].totalPrice = quantity * newItems[index].unitPrice;
    setItems(newItems);
  };

  const updateItemPrice = (index: number, unitPrice: number) => {
    const newItems = [...items];
    newItems[index].unitPrice = unitPrice;
    newItems[index].totalPrice = newItems[index].quantity * unitPrice;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      showToast.error("Ph�i c� �t nh�t 1 s�n ph�m");
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    showToast.success("� x�a s�n ph�m");
  };

  const handleAddProduct = (product: {
    partId: string;
    partName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }) => {
    const newItem = {
      id: `new-${Date.now()}`, // Temporary ID for new items
      partId: product.partId,
      partName: product.partName,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalPrice: product.quantity * product.unitPrice,
      notes: "",
      sku: product.sku,
    };
    setItems([...items, newItem]);
    setShowAddProductModal(false);
    showToast.success(`� th�m ${product.partName} (s� l�u khi b�m L�U)`);
  };

  const handleSaveSupplier = (supplierData: {
    name: string;
    phone: string;
    address: string;
    email: string;
  }) => {
    setSupplier(supplierData.name);
    setSupplierPhone(supplierData.phone);
    setShowSupplierModal(false);
    showToast.success(
      supplierModalMode === "add"
        ? "� th�m nh� cung c�p"
        : "� c�p nh�t nh� cung c�p"
    );
  };

  const handleEditSupplier = () => {
    setSupplierModalMode("edit");
    setShowSupplierModal(true);
  };

  const handleAddSupplier = () => {
    setSupplierModalMode("add");
    setShowSupplierModal(true);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    showToast.info("Click v�o � s� l��ng ho�c ��n gi� �� ch�0nh s�a");
  };

  const handleItemMenu = (index: number) => {
    if (confirm("B�n c� mu�n x�a s�n ph�m n�y?")) {
      removeItem(index);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) {
      showToast.error("Vui l�ng ch�n nh� cung c�p");
      return;
    }
    if (items.some((item) => item.quantity <= 0)) {
      showToast.error("S� l��ng ph�i l�:n h�n 0");
      return;
    }
    onSave({ supplier, supplierPhone, items, payments, isPaid });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  [Ch�0nh s�a] Phi�u Nh�p Kho {receipt.receiptCode}
                </h3>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {new Date(receipt.date).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                {new Date(receipt.date).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              �
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Supplier Section */}
            <div>
              <label className="block text-base font-medium text-teal-600 dark:text-teal-400 mb-2">
                Nh� cung c�p:
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative supplier-dropdown-container">
                  <input
                    type="text"
                    value={supplierSearchTerm}
                    onChange={(e) => {
                      setSupplierSearchTerm(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="T�m ki�m v� ch�n m�"t nh� cung c�p"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                  {supplierSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierSearchTerm("");
                        setSupplier("");
                        setSupplierPhone("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      �
                    </button>
                  )}
                  {/* Supplier Dropdown */}
                  {showSupplierDropdown && filteredSuppliers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredSuppliers.map((sup: any) => (
                        <button
                          key={sup.id}
                          type="button"
                          onClick={() => {
                            setSupplier(sup.name);
                            setSupplierSearchTerm(sup.name);
                            setSupplierPhone(sup.phone || "");
                            setShowSupplierDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0"
                        >
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {sup.name}
                          </div>
                          {sup.phone && (
                            <div className="text-xs text-slate-500">
                              Phone: {sup.phone}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleEditSupplier}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Ch�0nh s�a
                </button>
                <button
                  type="button"
                  onClick={handleAddSupplier}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <span className="text-xl">+</span>
                  Th�m m�:i
                </button>
              </div>
            </div>

            {/* Products Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-base font-medium text-teal-600 dark:text-teal-400">
                  Chi ti�t s�n ph�m nh�p kho:
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
                >
                  <span className="text-lg">+</span>
                  Th�m s�n ph�m
                </button>
              </div>

              {/* Products Table */}
              <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                        -
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                        T�n
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        SL
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                        �n gi� nh�p
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                        Th�nh ti�n
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                          editingItemIndex === index
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-sm text-slate-900 dark:text-slate-100">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {item.partName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            [Kh�c]
                          </div>
                          <div className="text-xs text-slate-500">
                            - G B�n l�: {formatCurrency(70000)}
                          </div>
                          <div className="text-xs text-slate-500">
                            - G B�n s�0: {formatCurrency(0)}
                          </div>
                          <div className="text-xs text-red-500">
                            (� xu�t kho)
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(index, Number(e.target.value))
                            }
                            onFocus={() => setEditingItemIndex(index)}
                            onBlur={() => setEditingItemIndex(null)}
                            min="1"
                            className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <FormattedNumberInput
                            value={item.unitPrice}
                            onValue={(val) => updateItemPrice(index, val)}
                            className="w-28 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(index)}
                              className="p-1 text-blue-400 hover:bg-blue-500/20 rounded"
                              title="Ch�0nh s�a"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleItemMenu(index)}
                              className="p-1 text-slate-400 hover:bg-slate-500/20 rounded"
                              title="X�a s�n ph�m"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100"
                      >
                        T�NG:
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4">
              <label className="block text-base font-medium text-teal-600 dark:text-teal-400 mb-3">
                C�ng n�:
              </label>

              {/* Total Payment */}
              <div className="flex items-center justify-between mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  T�NG PH�I CHI: {formatCurrency(totalAmount)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    � thanh to�n ��
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm flex items-center gap-1"
                  >
                    <span className="text-lg">+</span>
                    T�o phi�u chi
                  </button>
                </div>
              </div>

              {/* Payment Notice */}
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                T�"ng ph�i chi l� ph� ch�a ph�i tr� cho ��i t�c s�a ch�a
              </div>

              {/* Payment History Table */}
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left text-slate-700 dark:text-slate-300">
                      -
                    </th>
                    <th className="px-2 py-2 text-left text-slate-700 dark:text-slate-300">
                      Th�i gian
                    </th>
                    <th className="px-2 py-2 text-left text-slate-700 dark:text-slate-300">
                      Ng��i chi - Ghi ch�
                    </th>
                    <th className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
                      S� ti�n
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-200 dark:border-slate-700"
                    >
                      <td className="px-2 py-2 text-slate-900 dark:text-slate-100">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2 text-slate-900 dark:text-slate-100">
                        {payment.time}{" "}
                        {new Date(payment.date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-slate-900 dark:text-slate-100">
                          {payment.payer}
                        </div>
                        <div className="text-xs text-slate-500">
                          {payment.cashier}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-900 dark:text-slate-100">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-2 text-right font-bold text-slate-900 dark:text-slate-100"
                    >
                      T�"ng �� chi
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(totalPaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              �NG
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              L�U
            </button>
          </div>
        </form>

        {/* Supplier Modal */}
        <SupplierModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSave={handleSaveSupplier}
          initialData={
            supplierModalMode === "edit"
              ? { name: supplier, phone: supplierPhone, address: "", email: "" }
              : undefined
          }
          mode={supplierModalMode}
        />

        {/* Add Product Modal */}
        <AddProductToReceiptModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onAdd={handleAddProduct}
          currentBranchId={currentBranchId}
        />
      </div>
    </div>
  );
};


export default EditReceiptModal;

