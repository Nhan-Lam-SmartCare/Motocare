import React, { useState } from "react";
import {
  X,
  Zap,
  Droplets,
  Wrench,
  Gauge,
  Battery,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  Ban,
  CreditCard,
  Banknote,
  Search,
  User,
} from "lucide-react";
import { NumberInput } from "../common/NumberInput";
import {
  useQuickServices,
  useAllQuickServices,
  useCreateQuickService,
  useUpdateQuickService,
  useDeleteQuickService,
  useToggleQuickService,
  QuickService,
} from "../../hooks/useQuickServices";
import { formatCurrency } from "../../utils/format";
import { showToast } from "../../utils/toast";
import { supabase } from "../../supabaseClient";

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  droplets: <Droplets className="w-5 h-5 md:w-6 md:h-6" />,
  wrench: <Wrench className="w-5 h-5 md:w-6 md:h-6" />,
  gauge: <Gauge className="w-5 h-5 md:w-6 md:h-6" />,
  battery: <Battery className="w-5 h-5 md:w-6 md:h-6" />,
  "battery-charging": <Battery className="w-5 h-5 md:w-6 md:h-6" />,
  "oil-can": <Droplets className="w-5 h-5 md:w-6 md:h-6" />,
  disc: <Settings className="w-5 h-5 md:w-6 md:h-6" />,
  zap: <Zap className="w-5 h-5 md:w-6 md:h-6" />,
};

// Color mapping
const colorMap: Record<string, string> = {
  blue: "bg-blue-500 hover:bg-blue-600",
  cyan: "bg-cyan-500 hover:bg-cyan-600",
  orange: "bg-orange-500 hover:bg-orange-600",
  amber: "bg-amber-500 hover:bg-amber-600",
  green: "bg-green-500 hover:bg-green-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  red: "bg-red-500 hover:bg-red-600",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  pink: "bg-pink-500 hover:bg-pink-600",
  indigo: "bg-indigo-500 hover:bg-indigo-600",
};

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  vehicleModel: string;
  licensePlate: string;
}

interface QuickServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (
    service: QuickService,
    quantity: number,
    paymentMethod: "cash" | "bank",
    customer: CustomerInfo
  ) => void;
  branchId?: string;
}

const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  branchId,
}) => {
  const { data: services = [], isLoading } = useQuickServices(branchId);
  const [showManagement, setShowManagement] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Payment flow states
  const [selectedService, setSelectedService] = useState<QuickService | null>(
    null
  );
  const [customPrice, setCustomPrice] = useState<number | null>(null); // Custom price for editing
  const [licensePlate, setLicensePlate] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<CustomerInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | null>(
    null
  );

  if (!isOpen) return null;

  const resetPaymentFlow = () => {
    setSelectedService(null);
    setCustomPrice(null);
    setLicensePlate("");
    setFoundCustomer(null);
    setPaymentMethod(null);
  };

  const handleSelectService = (service: QuickService) => {
    setSelectedService(service);
    setCustomPrice(null); // Reset custom price when selecting new service
    setLicensePlate("");
    setFoundCustomer(null);
    setPaymentMethod(null);
  };

  // Get current price (custom or default)
  const getCurrentPrice = () => {
    if (!selectedService) return 0;
    return customPrice !== null ? customPrice : selectedService.price;
  };

  const handleSearchCustomer = async () => {
    if (!licensePlate.trim()) {
      setFoundCustomer(null);
      return;
    }

    setIsSearching(true);
    try {
      // Chuẩn hóa biển số: loại bỏ dấu gạch, khoảng trắng, chuyển uppercase
      const normalizedPlate = licensePlate
        .trim()
        .replace(/[-\s.]/g, "")
        .toUpperCase();

      console.log("[QuickService] Searching for plate:", normalizedPlate);

      // Bước 1: Tìm trong licenseplate trước (DB dùng lowercase columns)
      let { data: directMatch, error: directError } = await supabase
        .from("customers")
        .select("id, name, phone, licenseplate, totalspent, vehicles")
        .ilike("licenseplate", `%${licensePlate.trim()}%`)
        .limit(5);

      console.log(
        "[QuickService] Direct match result:",
        directMatch,
        directError
      );

      // Bước 2: Nếu không tìm thấy, lấy tất cả customers và filter vehicles
      if (!directMatch || directMatch.length === 0 || directError) {
        // Lấy customers có vehicles (không rỗng)
        const { data: allCustomers, error: allError } = await supabase
          .from("customers")
          .select("id, name, phone, licenseplate, totalspent, vehicles")
          .not("vehicles", "is", null)
          .limit(1000);

        console.log(
          "[QuickService] All customers with vehicles:",
          allCustomers?.length,
          allError
        );

        if (allCustomers && !allError) {
          // Filter ở client side
          directMatch = allCustomers.filter((customer) => {
            if (!customer.vehicles || !Array.isArray(customer.vehicles))
              return false;
            return customer.vehicles.some((v: any) => {
              const vPlate = (v.licensePlate || "")
                .replace(/[-\s.]/g, "")
                .toUpperCase();
              return (
                vPlate.includes(normalizedPlate) ||
                normalizedPlate.includes(vPlate)
              );
            });
          });
          console.log(
            "[QuickService] Filtered by vehicles:",
            directMatch?.length
          );
        }
      }

      // Tìm customer có biển số khớp nhất
      let matchedCustomer = null;
      let matchedVehicle: any = null;

      for (const customer of directMatch || []) {
        // Kiểm tra licenseplate trực tiếp (DB column lowercase)
        const customerPlate = (customer.licenseplate || "")
          .replace(/[-\s.]/g, "")
          .toUpperCase();
        if (
          customerPlate &&
          (customerPlate.includes(normalizedPlate) ||
            normalizedPlate.includes(customerPlate))
        ) {
          matchedCustomer = customer;
          matchedVehicle = {
            model: "",
            licensePlate: customer.licenseplate,
          };
          break;
        }

        // Kiểm tra trong mảng vehicles
        if (customer.vehicles && Array.isArray(customer.vehicles)) {
          for (const vehicle of customer.vehicles) {
            const vPlate = (vehicle.licensePlate || "")
              .replace(/[-\s.]/g, "")
              .toUpperCase();
            if (
              vPlate &&
              (vPlate.includes(normalizedPlate) ||
                normalizedPlate.includes(vPlate))
            ) {
              matchedCustomer = customer;
              matchedVehicle = vehicle;
              break;
            }
          }
        }
        if (matchedCustomer) break;
      }

      console.log(
        "[QuickService] Matched customer:",
        matchedCustomer?.name,
        matchedVehicle
      );

      if (matchedCustomer) {
        const loyaltyPoints = Math.floor(
          (matchedCustomer.totalspent || 0) / 10000
        );
        setFoundCustomer({
          id: matchedCustomer.id,
          name: matchedCustomer.name || "",
          phone: matchedCustomer.phone || "",
          vehicleModel: matchedVehicle?.model || "",
          licensePlate:
            matchedVehicle?.licensePlate ||
            (matchedCustomer as any).licenseplate ||
            (matchedCustomer as any).license_plate ||
            licensePlate,
          loyaltyPoints: loyaltyPoints,
        } as CustomerInfo & { loyaltyPoints: number });
        showToast.success(
          `Tìm thấy: ${matchedCustomer.name} (${loyaltyPoints} điểm)`
        );
      } else {
        setFoundCustomer(null);
        showToast.info("Không tìm thấy khách hàng");
      }
    } catch (err) {
      console.error("Search customer error:", err);
      setFoundCustomer(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmPayment = () => {
    if (!selectedService || !paymentMethod) return;

    const qty = quantities[selectedService.id] || 1;
    const finalPrice = getCurrentPrice();
    const customer: CustomerInfo = foundCustomer || {
      name: "Khách vãng lai",
      phone: "",
      vehicleModel: "",
      licensePlate: licensePlate || "",
    };

    // Pass service with custom price if modified
    const serviceWithPrice = {
      ...selectedService,
      price: finalPrice,
    };

    onComplete(serviceWithPrice, qty, paymentMethod, customer);
    resetPaymentFlow();
    onClose();
  };

  const updateQuantity = (serviceId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [serviceId]: Math.max(1, (prev[serviceId] || 1) + delta),
    }));
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, QuickService[]>);

  const categoryLabels: Record<string, string> = {
    wash: "🚿 Rửa xe",
    repair: "🔧 Sửa chữa nhanh",
    maintenance: "🛠️ Bảo dưỡng",
    other: "📦 Khác",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[70] md:p-4 modal-bottom-safe">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up md:animate-none">
        {/* Header - Compact on mobile */}
        <div className="flex justify-between items-center p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 bg-emerald-600">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-white">
                Dịch vụ nhanh
              </h2>
              <p className="text-xs md:text-sm text-white/80 hidden md:block">
                Chọn dịch vụ để thanh toán nhanh
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setShowManagement(!showManagement)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              title="Quản lý dịch vụ"
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {showManagement ? (
            <ServiceManagement onBack={() => setShowManagement(false)} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8 md:py-12">
              <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Wrench className="w-12 h-12 md:w-16 md:h-16 mx-auto text-slate-300 dark:text-slate-600 mb-3 md:mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-3 md:mb-4 text-sm md:text-base">
                Chưa có dịch vụ nhanh nào
              </p>
              <button
                onClick={() => setShowManagement(true)}
                className="px-3 py-2 md:px-4 md:py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm"
              >
                <Plus className="w-4 h-4 inline mr-1 md:mr-2" />
                Thêm dịch vụ
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {Object.entries(groupedServices).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 md:mb-3">
                    {categoryLabels[category] || category}
                  </h3>
                  {/* Mobile: 3 columns, compact cards. Desktop: 4-5 columns */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {items.map((service) => (
                      <div
                        key={service.id}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-1.5 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all"
                      >
                        {/* Service button - More compact on mobile */}
                        <button
                          onClick={() => handleSelectService(service)}
                          className={`w-full ${colorMap[service.color] || colorMap.blue
                            } text-white rounded-md p-2 mb-1.5 transition-all hover:scale-105 active:scale-95`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {iconMap[service.icon] || (
                              <Wrench className="w-4 h-4" />
                            )}
                            <span className="font-semibold text-[10px] md:text-xs line-clamp-1">
                              {service.name}
                            </span>
                            <span className="text-xs md:text-sm font-bold">
                              {formatCurrency(service.price)}
                            </span>
                          </div>
                        </button>

                        {/* Quantity controls - Compact */}
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQuantity(service.id, -1)}
                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-semibold text-slate-700 dark:text-slate-200 text-xs">
                            {quantities[service.id] || 1}
                          </span>
                          <button
                            onClick={() => updateQuantity(service.id, 1)}
                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Compact on mobile */}
        {!showManagement && !selectedService && (
          <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-center">
              💡 Chạm dịch vụ để thanh toán nhanh
            </p>
          </div>
        )}
      </div>

      {/* Payment Flow Modal Overlay */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[80] modal-bottom-safe">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up md:animate-none mx-0 md:mx-4">
            {/* Payment Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-500 to-teal-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedService.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {formatCurrency(getCurrentPrice())} x{" "}
                    {quantities[selectedService.id] || 1} ={" "}
                    <span className="font-bold">
                      {formatCurrency(
                        getCurrentPrice() *
                        (quantities[selectedService.id] || 1)
                      )}
                    </span>
                  </p>
                </div>
                <button
                  onClick={resetPaymentFlow}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Payment Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Editable Price Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  💰 Giá dịch vụ (có thể chỉnh sửa)
                </label>
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={getCurrentPrice()}
                    onChange={(val) => setCustomPrice(val)}
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                  {customPrice !== null &&
                    customPrice !== selectedService.price && (
                      <button
                        onClick={() => setCustomPrice(null)}
                        className="px-3 py-2.5 text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                        title="Khôi phục giá gốc"
                      >
                        Giá gốc: {formatCurrency(selectedService.price)}
                      </button>
                    )}
                </div>
                {customPrice !== null &&
                  customPrice !== selectedService.price && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Đã thay đổi từ giá gốc{" "}
                      {formatCurrency(selectedService.price)}
                    </p>
                  )}
              </div>

              {/* License Plate Search (Optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  🔍 Biển số xe (tùy chọn - tra khách quen)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) =>
                      setLicensePlate(e.target.value.toUpperCase())
                    }
                    placeholder="VD: 59A-12345"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white uppercase"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSearchCustomer()
                    }
                  />
                  <button
                    onClick={handleSearchCustomer}
                    disabled={isSearching || !licensePlate.trim()}
                    className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Found Customer Info */}
              {foundCustomer && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <User className="w-4 h-4" />
                      <span className="font-semibold text-sm">Khách quen</span>
                    </div>
                    {(foundCustomer as any).loyaltyPoints > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                        ⭐ {(foundCustomer as any).loyaltyPoints} điểm
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    {foundCustomer.name}
                  </p>
                  {foundCustomer.phone && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      📞 {foundCustomer.phone}
                    </p>
                  )}
                  {foundCustomer.vehicleModel && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      🏍️ {foundCustomer.vehicleModel}
                    </p>
                  )}
                </div>
              )}

              {/* No Customer - Default */}
              {!foundCustomer && licensePlate && !isSearching && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Không tìm thấy khách hàng. Sẽ lưu với biển số:{" "}
                    <strong>{licensePlate}</strong>
                  </p>
                </div>
              )}

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  💳 Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === "cash"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-600 hover:border-emerald-300 text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    <Banknote className="w-8 h-8" />
                    <span className="font-semibold text-sm">Tiền mặt</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === "bank"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-600 hover:border-blue-300 text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    <CreditCard className="w-8 h-8" />
                    <span className="font-semibold text-sm">Chuyển khoản</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex gap-3">
                <button
                  onClick={resetPaymentFlow}
                  className="flex-1 py-3 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={!paymentMethod}
                  className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Thanh toán
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                {foundCustomer
                  ? `Khách: ${foundCustomer.name}`
                  : licensePlate
                    ? `Biển số: ${licensePlate}`
                    : "Khách vãng lai"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Service Management Component
const ServiceManagement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { data: services = [], isLoading } = useAllQuickServices();
  const createMutation = useCreateQuickService();
  const updateMutation = useUpdateQuickService();
  const deleteMutation = useDeleteQuickService();
  const toggleMutation = useToggleQuickService();

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<QuickService | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    category: "other",
    description: "",
    icon: "wrench",
    color: "blue",
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      price: 0,
      category: "other",
      description: "",
      icon: "wrench",
      color: "blue",
      sort_order: 0,
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handleEdit = (service: QuickService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price,
      category: service.category,
      description: service.description || "",
      icon: service.icon,
      color: service.color,
      sort_order: service.sort_order,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) {
      showToast.error("Vui lòng nhập tên và giá dịch vụ");
      return;
    }

    try {
      if (editingService) {
        await updateMutation.mutateAsync({
          id: editingService.id,
          ...formData,
        });
        showToast.success("Đã cập nhật dịch vụ");
      } else {
        await createMutation.mutateAsync({
          ...formData,
          is_active: true,
        });
        showToast.success("Đã tạo dịch vụ mới");
      }
      resetForm();
    } catch (err: any) {
      showToast.error(err.message || "Lỗi khi lưu dịch vụ");
    }
  };

  const handleDelete = async (service: QuickService) => {
    if (!confirm(`Xóa dịch vụ "${service.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(service.id);
      showToast.success("Đã xóa dịch vụ");
    } catch (err: any) {
      showToast.error(err.message || "Lỗi khi xóa");
    }
  };

  const handleToggle = async (service: QuickService) => {
    try {
      await toggleMutation.mutateAsync({
        id: service.id,
        is_active: !service.is_active,
      });
      showToast.success(
        service.is_active ? "Đã ẩn dịch vụ" : "Đã hiện dịch vụ"
      );
    } catch (err: any) {
      showToast.error(err.message || "Lỗi");
    }
  };

  const categories = [
    { value: "wash", label: "Rửa xe" },
    { value: "repair", label: "Sửa chữa nhanh" },
    { value: "maintenance", label: "Bảo dưỡng" },
    { value: "other", label: "Khác" },
  ];

  const colors = [
    { value: "blue", label: "Xanh dương" },
    { value: "cyan", label: "Xanh cyan" },
    { value: "green", label: "Xanh lá" },
    { value: "orange", label: "Cam" },
    { value: "amber", label: "Vàng cam" },
    { value: "yellow", label: "Vàng" },
    { value: "red", label: "Đỏ" },
    { value: "purple", label: "Tím" },
    { value: "pink", label: "Hồng" },
    { value: "indigo", label: "Chàm" },
  ];

  const icons = [
    { value: "droplets", label: "💧 Giọt nước" },
    { value: "wrench", label: "🔧 Cờ lê" },
    { value: "gauge", label: "🎯 Đồng hồ" },
    { value: "battery", label: "🔋 Pin" },
    { value: "zap", label: "⚡ Sét" },
    { value: "disc", label: "💿 Đĩa" },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 md:gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          ← Quay lại
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1 md:gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm dịch vụ</span>
          <span className="sm:hidden">Thêm</span>
        </button>
      </div>

      {/* Form - Optimized for mobile */}
      {showForm && (
        <div className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3 md:p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 md:mb-4 text-sm md:text-base">
            {editingService ? "Sửa dịch vụ" : "Thêm dịch vụ mới"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {/* Mobile: Stack vertically. Desktop: 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên dịch vụ *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="VD: Rửa xe máy"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá (VNĐ) *
                </label>
                <NumberInput
                  value={formData.price}
                  onChange={(val) => setFormData({ ...formData, price: val })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="VD: 20.000"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Danh mục
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Color & Icon in same row on mobile */}
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Màu sắc
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full px-2 md:px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {colors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Icon
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    className="w-full px-2 md:px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {icons.map((icon) => (
                      <option key={icon.value} value={icon.value}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="hidden md:block">
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Thứ tự
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            {/* Description - Hidden on mobile for simplicity */}
            <div className="hidden md:block">
              <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Mô tả ngắn về dịch vụ"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 text-sm"
              >
                {editingService ? "Cập nhật" : "Tạo mới"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 text-sm"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Service List - Compact on mobile */}
      {isLoading ? (
        <div className="text-center py-6 md:py-8 text-sm">Đang tải...</div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.id}
              className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${service.is_active
                ? "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-60"
                }`}
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${colorMap[service.color] || colorMap.blue
                    }`}
                >
                  {iconMap[service.icon] || (
                    <Wrench className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 dark:text-white text-sm truncate">
                    {service.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(service.price)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(service)}
                  className={`p-1.5 md:p-2 rounded-lg ${service.is_active
                    ? "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  title={service.is_active ? "Ẩn" : "Hiện"}
                >
                  {service.is_active ? (
                    <Check className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Ban className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(service)}
                  className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                  title="Sửa"
                >
                  <Pencil className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={() => handleDelete(service)}
                  className="p-1.5 md:p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickServiceModal;
