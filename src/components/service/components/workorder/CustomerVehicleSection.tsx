import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkOrder, Vehicle } from "../../../../types";
import { formatWorkOrderId, normalizeSearchText } from "../../../../utils/format";
import { validatePhoneNumber } from "../../../../utils/validation";
import { showToast } from "../../../../utils/toast";
import { supabase } from "../../../../supabaseClient";
import { POPULAR_MOTORCYCLES } from "../../constants/service.constants";

interface StoreSettings {
  store_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  bank_qr_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_branch?: string;
  work_order_prefix?: string;
}

interface CustomerVehicleSectionProps {
  formData: Partial<WorkOrder>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WorkOrder>>>;
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  customers: any[];
  serverCustomers: any[];
  isSearchingCustomer: boolean;
  hasMoreCustomers: boolean;
  customerPage: number;
  fetchCustomers: (page: number, searchTerm: string, isLoadMore?: boolean) => Promise<void>;
  handleLoadMoreCustomers: (e: React.MouseEvent) => void;
  filteredCustomers: any[];
  upsertCustomer: (customer: any) => Promise<string> | void;
  freshCustomer: any;
  setFreshCustomer: React.Dispatch<React.SetStateAction<any>>;
  currentBranchId: string;
  storeSettings?: StoreSettings | null;
  allCustomers: any[];
}

export const CustomerVehicleSection: React.FC<CustomerVehicleSectionProps> = ({
  formData,
  setFormData,
  customerSearch,
  setCustomerSearch,
  customers,
  serverCustomers,
  isSearchingCustomer,
  hasMoreCustomers,
  customerPage,
  fetchCustomers,
  handleLoadMoreCustomers,
  filteredCustomers,
  upsertCustomer,
  freshCustomer,
  setFreshCustomer,
  currentBranchId,
  storeSettings,
  allCustomers,
}) => {
  const queryClient = useQueryClient();

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddVehicleModelDropdown, setShowAddVehicleModelDropdown] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    vehicleModel: "",
    licensePlate: "",
  });

  const [newVehicle, setNewVehicle] = useState({
    model: "",
    licensePlate: "",
  });

  // Edit customer state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");

  // Edit vehicle state
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVehicleLicensePlate, setEditVehicleLicensePlate] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".customer-search-container")) {
        setShowCustomerDropdown(false);
      }
      if (!target.closest(".vehicle-search-container")) {
        setShowVehicleDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current customer
  const customerById = formData.customerId
    ? allCustomers.find((c) => c.id === formData.customerId)
    : undefined;

  const customerByPhone = !formData.customerId && formData.customerPhone
    ? allCustomers.find((c) => {
        if (!c.phone) return false;
        const normalizePhone = (p: string) => p.replace(/\D/g, "");
        const formPhone = normalizePhone(formData.customerPhone!);
        const customerPhones = c.phone.split(",").map((p: string) => normalizePhone(p.trim()));
        return customerPhones.some((cp: string) => cp === formPhone);
      })
    : undefined;

  const currentCustomer = customerById || customerByPhone || null;
  const customerVehicles = currentCustomer?.vehicles || [];

  const handleSelectVehicle = (vehicle: any) => {
    setFormData({
      ...formData,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      licensePlate: vehicle.licensePlate,
    });
    setShowVehicleDropdown(false);
  };

  const handleAddVehicle = () => {
    if (!currentCustomer) return;
    if (!newVehicle.model.trim() || !newVehicle.licensePlate.trim()) {
      showToast.error("Vui lòng nhập đầy đủ loại xe và biển số");
      return;
    }

    const vehicleId = `VEH-${Date.now()}`;
    const existingVehicles = currentCustomer.vehicles || [];

    const updatedVehicles = [
      ...existingVehicles,
      {
        id: vehicleId,
        model: newVehicle.model.trim(),
        licensePlate: newVehicle.licensePlate.trim(),
        isPrimary: existingVehicles.length === 0,
      },
    ];

    upsertCustomer({
      ...currentCustomer,
      vehicles: updatedVehicles,
    });

    setFreshCustomer((prev: any) => (prev ? { ...prev, vehicles: updatedVehicles } : prev));

    setFormData({
      ...formData,
      vehicleId: vehicleId,
      vehicleModel: newVehicle.model.trim(),
      licensePlate: newVehicle.licensePlate.trim(),
    });

    setNewVehicle({ model: "", licensePlate: "" });
    setShowAddVehicleModal(false);
    showToast.success("Đã thêm xe mới");
  };

  const handleSaveEditedCustomer = async () => {
    if (!currentCustomer) return;
    if (!editCustomerName.trim() || !editCustomerPhone.trim()) {
      showToast.error("Vui lòng nhập đầy đủ tên và số điện thoại");
      return;
    }

    try {
      await upsertCustomer({
        ...currentCustomer,
        name: editCustomerName.trim(),
        phone: editCustomerPhone.trim(),
      });

      setFormData({
        ...formData,
        customerName: editCustomerName.trim(),
        customerPhone: editCustomerPhone.trim(),
      });

      setCustomerSearch(editCustomerName.trim());
      setIsEditingCustomer(false);
      showToast.success("Đã cập nhật thông tin khách hàng");
    } catch (error) {
      console.error("Error updating customer:", error);
      showToast.error("Có lỗi khi cập nhật thông tin");
    }
  };

  const handleSaveEditedVehicle = async () => {
    if (!currentCustomer || !editingVehicleId) return;
    if (!editVehicleModel.trim() && !editVehicleLicensePlate.trim()) {
      showToast.error("Vui lòng nhập ít nhất dòng xe hoặc biển số");
      return;
    }

    try {
      const updatedVehicles =
        currentCustomer.vehicles?.map((v: any) =>
          v.id === editingVehicleId
            ? {
                ...v,
                model: editVehicleModel.trim(),
                licensePlate: editVehicleLicensePlate.trim(),
              }
            : v
        ) || [];

      await upsertCustomer({
        ...currentCustomer,
        vehicles: updatedVehicles,
      });

      setFreshCustomer((prev: any) => (prev ? { ...prev, vehicles: updatedVehicles } : prev));

      if (formData.vehicleId === editingVehicleId) {
        setFormData({
          ...formData,
          vehicleModel: editVehicleModel.trim(),
          licensePlate: editVehicleLicensePlate.trim(),
        });
      }

      setEditingVehicleId(null);
      setEditVehicleModel("");
      setEditVehicleLicensePlate("");
      showToast.success("Đã cập nhật thông tin xe");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      showToast.error("Có lỗi khi cập nhật thông tin xe");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold">1</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Khách hàng & Xe
        </h3>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Khách hàng <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative customer-search-container">
              <input
                type="text"
                placeholder="Tìm khách hàng..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  setFormData({
                    ...formData,
                    customerId: "",
                    customerName: e.target.value,
                    customerPhone: "",
                    vehicleId: undefined,
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />

              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    <>
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            const primaryVehicle =
                              customer.vehicles?.find((v: Vehicle) => v.isPrimary) ||
                              customer.vehicles?.[0];

                            setFormData({
                              ...formData,
                              customerId: customer.id,
                              customerName: customer.name,
                              customerPhone: customer.phone,
                              vehicleId: primaryVehicle?.id,
                              vehicleModel: primaryVehicle?.model || customer.vehicleModel || "",
                              licensePlate: primaryVehicle?.licensePlate || customer.licensePlate || "",
                            });
                            setCustomerSearch(customer.name);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 border-b border-slate-200 dark:border-slate-600 last:border-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                                {customer.name}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                🔹 {customer.phone}
                              </div>
                              {(customer.vehicleModel ||
                                customer.licensePlate ||
                                customer.vehicles?.length > 0) && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle cx="6" cy="17" r="2" />
                                    <circle cx="18" cy="17" r="2" />
                                    <path d="M4 17h2l4-6h2l2 3h4" />
                                  </svg>
                                  {(() => {
                                    const primaryVehicle =
                                      customer.vehicles?.find((v: any) => v.isPrimary) ||
                                      customer.vehicles?.[0];
                                    const model = primaryVehicle?.model || customer.vehicleModel;
                                    const plate =
                                      primaryVehicle?.licensePlate || customer.licensePlate;
                                    return (
                                      <>
                                        {model && <span>{model}</span>}
                                        {plate && (
                                          <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                                            {model && " - "}
                                            {plate}
                                          </span>
                                        )}
                                        {customer.vehicles?.length > 1 && (
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                                            (+{customer.vehicles.length - 1})
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      {hasMoreCustomers && customerSearch.trim() && (
                        <button
                          type="button"
                          onClick={handleLoadMoreCustomers}
                          className="w-full text-center px-3 py-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-slate-200 dark:border-slate-600"
                        >
                          {isSearchingCustomer ? "Đang tải..." : "⬇️ Tải thêm khách hàng..."}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      {customers.length === 0
                        ? "Chưa có khách hàng nào. Nhấn '+' để thêm khách hàng mới."
                        : "Không tìm thấy khách hàng phù hợp"}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddCustomerModal(true);
                if (customerSearch && /^[0-9]+$/.test(customerSearch)) {
                  setNewCustomer({
                    ...newCustomer,
                    phone: customerSearch,
                  });
                }
              }}
              className="w-10 h-10 flex items-center justify-center border border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10 rounded-lg text-xl"
              title="Thêm khách hàng mới"
            >
              +
            </button>
          </div>

          {formData.customerName && formData.customerPhone && (
            <div className="mt-3 p-4 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/60 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                {!isEditingCustomer ? (
                  <>
                    <div className="space-y-1.5 flex-1 pr-2">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
                        {formData.customerName}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 6.75c0 8.284 6.716 15 15 15 .828 0 1.5-.672 1.5-1.5v-2.25a1.5 1.5 0 00-1.5-1.5h-1.158a1.5 1.5 0 00-1.092.468l-.936.996a1.5 1.5 0 01-1.392.444 12.035 12.035 0 01-7.29-7.29 1.5 1.5 0 01.444-1.392l.996-.936a1.5 1.5 0 00.468-1.092V6.75A1.5 1.5 0 006.75 5.25H4.5c-.828 0-1.5.672-1.5 1.5z"
                            />
                          </svg>
                          <span className="font-medium">{formData.customerPhone}</span>
                        </span>
                        {(formData.vehicleModel || formData.licensePlate) && (
                          <span className="inline-flex items-center gap-1.5">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"
                            >
                              <circle cx="6" cy="17" r="2" />
                              <circle cx="18" cy="17" r="2" />
                              <path d="M4 17h2l4-6h2l2 3h4" />
                            </svg>
                            <span className="font-medium flex items-center gap-1.5">
                              {formData.vehicleModel}
                              {formData.licensePlate && (
                                <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 font-mono">
                                  {formData.licensePlate}
                                </span>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!currentCustomer && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!formData.customerName?.trim() || !formData.customerPhone?.trim()) {
                              showToast.error("Vui lòng nhập đầy đủ tên và số điện thoại");
                              return;
                            }

                            const phoneValidation = validatePhoneNumber(formData.customerPhone);
                            if (!phoneValidation.ok) {
                              showToast.error(phoneValidation.error || "Số điện thoại không hợp lệ");
                              return;
                            }

                            try {
                              const tempCustomerId = `CUST-${Date.now()}`;
                              const newCustomerData = {
                                id: tempCustomerId,
                                name: formData.customerName.trim(),
                                phone: formData.customerPhone.trim(),
                                created_at: new Date().toISOString(),
                              };

                              const realCustomerId =
                                (await upsertCustomer(newCustomerData)) || tempCustomerId;

                              setFormData({
                                ...formData,
                                customerId: realCustomerId,
                              });

                              queryClient.invalidateQueries({ queryKey: ["customers"] });
                            } catch (error: any) {
                              console.error("Error saving customer:", error);
                              const isDuplicatePhone =
                                error?.code === "23505" ||
                                error?.message?.includes("customers_phone_unique");

                              if (isDuplicatePhone) {
                                const normalizePhone = (p: string) => p.replace(/\D/g, "");
                                const searchPhoneDigits = normalizePhone(formData.customerPhone);

                                const existingCustomer = allCustomers.find((c) => {
                                  if (!c.phone) return false;
                                  const phones = c.phone
                                    .split(",")
                                    .map((p: string) => normalizePhone(p.trim()));
                                  return phones.some((p: string) => p === searchPhoneDigits);
                                });

                                if (existingCustomer) {
                                  setFormData({
                                    ...formData,
                                    customerId: existingCustomer.id,
                                    customerName: existingCustomer.name,
                                    customerPhone: existingCustomer.phone,
                                  });
                                  setCustomerSearch(existingCustomer.name);
                                  showToast.info(
                                    `Số điện thoại đã tồn tại. Đã chọn khách hàng: ${existingCustomer.name}`
                                  );
                                } else {
                                  showToast.error("Số điện thoại đã tồn tại trong hệ thống!");
                                }
                              } else {
                                showToast.error("Không thể lưu khách hàng");
                              }
                            }
                          }}
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 transition-all"
                          title="Lưu khách hàng vào hệ thống"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                            />
                          </svg>
                          <span>Lưu KH</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditCustomerName(formData.customerName || "");
                          setEditCustomerPhone(formData.customerPhone || "");
                          setIsEditingCustomer(true);
                        }}
                        className="text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        title="Sửa thông tin khách hàng"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearch("");
                          setFormData({
                            ...formData,
                            customerName: "",
                            customerPhone: "",
                            customerId: "",
                            vehicleId: undefined,
                            vehicleModel: "",
                            licensePlate: "",
                          });
                        }}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                        title="Xóa khách hàng"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="w-4 h-4"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Tên khách hàng
                      </label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Nhập tên khách hàng"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={editCustomerPhone}
                        onChange={(e) => setEditCustomerPhone(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingCustomer(false)}
                        className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditedCustomer}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          {(currentCustomer || formData.customerName) && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {customerVehicles.length > 0 ? "Chọn xe" : "Xe của khách hàng"}
                  {customerVehicles.length > 0 && (
                    <span className="text-xs text-slate-500 ml-1">
                      ({customerVehicles.length} xe)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(true)}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                  title="Thêm xe mới"
                >
                  + Thêm xe
                </button>
              </div>

              {customerVehicles.length > 0 ? (
                <div className="space-y-2">
                  {customerVehicles.map((vehicle: Vehicle) => {
                    const isSelected = formData.vehicleId === vehicle.id;
                    const isPrimary = vehicle.isPrimary;
                    const isEditing = editingVehicleId === vehicle.id;

                    return (
                      <div
                        key={vehicle.id}
                        className={`w-full rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? "border-blue-500/50 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 shadow-md shadow-blue-500/5"
                            : "border-slate-200 dark:border-slate-800/60 bg-slate-100/30 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/30"
                        }`}
                      >
                        {isEditing ? (
                          <div className="p-3 space-y-2">
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Dòng xe
                              </label>
                              <input
                                type="text"
                                value={editVehicleModel}
                                onChange={(e) => setEditVehicleModel(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-850 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                                placeholder="Nhập dòng xe"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Biển số
                              </label>
                              <input
                                type="text"
                                value={editVehicleLicensePlate}
                                onChange={(e) =>
                                  setEditVehicleLicensePlate(e.target.value.toUpperCase())
                                }
                                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-850 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                                placeholder="Nhập biển số"
                              />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVehicleId(null);
                                  setEditVehicleModel("");
                                  setEditVehicleLicensePlate("");
                                }}
                                className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEditedVehicle}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectVehicle(vehicle)}
                            className="w-full text-left px-4 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {vehicle.model}
                                  </div>
                                  {isPrimary && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                                      title="Xe chính mặc định"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-2.5 h-2.5 text-amber-500"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Mặc định
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold font-mono text-blue-600 dark:text-blue-400 mt-1 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded inline-block">
                                  {vehicle.licensePlate}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVehicleId(vehicle.id);
                                    setEditVehicleModel(vehicle.model || "");
                                    setEditVehicleLicensePlate(vehicle.licensePlate || "");
                                  }}
                                  className="text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                                  title="Sửa thông tin xe"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                {isSelected && (
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white shadow-sm shadow-blue-500/20">
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={3}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-slate-350 dark:border-slate-700 text-center rounded-xl text-xs text-slate-500 dark:text-slate-400">
                  Khách hàng chưa đăng ký phương tiện nào. Nhấn "+ Thêm xe" để bắt đầu.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 m-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Thêm khách hàng
              </h3>
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Đóng"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên khách
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên khách"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  placeholder="VD: 09xxxx"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative vehicle-search-container">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dòng xe
                  </label>
                  <input
                    type="text"
                    placeholder="Chọn hoặc nhập dòng xe"
                    value={newCustomer.vehicleModel}
                    onChange={(e) => {
                      setNewCustomer({
                        ...newCustomer,
                        vehicleModel: e.target.value,
                      });
                      setShowVehicleDropdown(true);
                    }}
                    onFocus={() => setShowVehicleDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />

                  {showVehicleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                      {POPULAR_MOTORCYCLES.filter((model) =>
                        model.toLowerCase().includes(newCustomer.vehicleModel.toLowerCase())
                      ).map((model: string) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => {
                            setNewCustomer({
                              ...newCustomer,
                              vehicleModel: model,
                            });
                            setShowVehicleDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm border-b border-slate-200 dark:border-slate-600 last:border-0 text-slate-900 dark:text-slate-100"
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Biển số
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 59A1-123.45"
                    value={newCustomer.licensePlate}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        licensePlate: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newCustomer.name && newCustomer.phone) {
                    const existingCustomer = customers.find((c) => c.phone === newCustomer.phone);

                    if (!existingCustomer) {
                      const customerId = `CUST-${Date.now()}`;
                      const vehicleId = `VEH-${Date.now()}`;
                      const vehicles = [];
                      if (newCustomer.vehicleModel || newCustomer.licensePlate) {
                        vehicles.push({
                          id: vehicleId,
                          model: newCustomer.vehicleModel || "",
                          licensePlate: newCustomer.licensePlate || "",
                          isPrimary: true,
                        });
                      }

                      upsertCustomer({
                        id: customerId,
                        name: newCustomer.name,
                        phone: newCustomer.phone,
                        vehicles: vehicles.length > 0 ? vehicles : undefined,
                        vehicleModel: newCustomer.vehicleModel,
                        licensePlate: newCustomer.licensePlate,
                        created_at: new Date().toISOString(),
                      });

                      setFormData({
                        ...formData,
                        customerId: customerId,
                        customerName: newCustomer.name,
                        customerPhone: newCustomer.phone,
                        vehicleId: vehicles.length > 0 ? vehicleId : undefined,
                        vehicleModel: newCustomer.vehicleModel,
                        licensePlate: newCustomer.licensePlate,
                      });
                    } else {
                      const hasVehicleChange =
                        (newCustomer.vehicleModel &&
                          newCustomer.vehicleModel !== existingCustomer.vehicleModel) ||
                        (newCustomer.licensePlate &&
                          newCustomer.licensePlate !== existingCustomer.licensePlate);

                      let vehicleIdToUse = existingCustomer.vehicles?.[0]?.id;

                      if (hasVehicleChange) {
                        const vehicleId = `VEH-${Date.now()}`;
                        const vehicles = [...(existingCustomer.vehicles || [])];

                        const existingVehicleIndex = vehicles.findIndex(
                          (v) => v.licensePlate === newCustomer.licensePlate
                        );

                        if (existingVehicleIndex >= 0 && newCustomer.licensePlate) {
                          vehicles[existingVehicleIndex] = {
                            ...vehicles[existingVehicleIndex],
                            model: newCustomer.vehicleModel || vehicles[existingVehicleIndex].model,
                          };
                          vehicleIdToUse = vehicles[existingVehicleIndex].id;
                        } else if (newCustomer.vehicleModel || newCustomer.licensePlate) {
                          vehicles.push({
                            id: vehicleId,
                            model: newCustomer.vehicleModel || "",
                            licensePlate: newCustomer.licensePlate || "",
                            isPrimary: vehicles.length === 0,
                          });
                          vehicleIdToUse = vehicleId;
                        }

                        upsertCustomer({
                          ...existingCustomer,
                          vehicles: vehicles.length > 0 ? vehicles : undefined,
                          vehicleModel: newCustomer.vehicleModel || existingCustomer.vehicleModel,
                          licensePlate: newCustomer.licensePlate || existingCustomer.licensePlate,
                        });
                      }

                      setFormData({
                        ...formData,
                        customerId: existingCustomer.id,
                        customerName: existingCustomer.name,
                        customerPhone: existingCustomer.phone,
                        vehicleId: vehicleIdToUse,
                        vehicleModel: newCustomer.vehicleModel || existingCustomer.vehicleModel,
                        licensePlate: newCustomer.licensePlate || existingCustomer.licensePlate,
                      });
                    }

                    setCustomerSearch(newCustomer.name);
                    setShowAddCustomerModal(false);
                    setNewCustomer({
                      name: "",
                      phone: "",
                      vehicleModel: "",
                      licensePlate: "",
                    });
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                disabled={!newCustomer.name || !newCustomer.phone}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && currentCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Thêm xe cho {currentCustomer.name}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Loại xe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Exciter, Vision, Wave..."
                  value={newVehicle.model}
                  onChange={(e) => {
                    setNewVehicle({ ...newVehicle, model: e.target.value });
                    setShowAddVehicleModelDropdown(true);
                  }}
                  onFocus={() => setShowAddVehicleModelDropdown(true)}
                  onBlur={() => setTimeout(() => setShowAddVehicleModelDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  autoFocus
                />
                {showAddVehicleModelDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {POPULAR_MOTORCYCLES.filter((model) =>
                      model.toLowerCase().includes(newVehicle.model.toLowerCase())
                    )
                      .slice(0, 20)
                      .map((model, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewVehicle({ ...newVehicle, model });
                            setShowAddVehicleModelDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm border-b border-slate-200 dark:border-slate-600 last:border-0 text-slate-900 dark:text-slate-100"
                        >
                          {model}
                        </button>
                      ))}
                    {POPULAR_MOTORCYCLES.filter((model) =>
                      model.toLowerCase().includes(newVehicle.model.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                        Không tìm thấy - nhập tên xe mới
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Biển số <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 29A 12345"
                  value={newVehicle.licensePlate}
                  onChange={(e) =>
                    setNewVehicle({
                      ...newVehicle,
                      licensePlate: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                `🔹 Xe mới sẽ tự động được chọn sau khi thêm`
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddVehicleModal(false);
                  setNewVehicle({ model: "", licensePlate: "" });
                  setShowAddVehicleModelDropdown(false);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddVehicle}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                disabled={!newVehicle.model.trim() || !newVehicle.licensePlate.trim()}
              >
                Thêm xe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
