import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Wrench,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  ChevronRight,
  PhoneCall,
  User,
  ShieldCheck,
  Bike,
  Activity,
  DollarSign,
  ChevronDown,
  Info,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { formatCurrency, formatDate } from "../../utils/format";
import { checkVehicleMaintenance, formatKm } from "../../utils/maintenanceReminder";
import type { WorkOrder, Vehicle } from "../../types";

interface PublicTrackingData {
  workOrder: WorkOrder;
  vehicle: Vehicle;
  history: any[];
}

export default function CustomerPortal() {
  const { orderId } = useParams<{ orderId: string }>();
  const [data, setData] = useState<PublicTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState<{ [key: string]: boolean }>({});

  const fetchTrackingData = async (silent = false) => {
    if (!orderId) return;
    if (!silent) setLoading(true);

    try {
      const { data: res, error: rpcError } = await supabase.rpc("get_public_work_order", {
        p_order_id: orderId,
      });

      if (rpcError) {
        console.error("RPC Error fetching tracking data:", rpcError);
        setError("Không thể tải thông tin tra cứu. Vui lòng kiểm tra lại mã phiếu!");
      } else if (!res) {
        setError("Không tìm thấy thông tin phiếu sửa chữa này trong hệ thống.");
      } else {
        setData(res as PublicTrackingData);
        setError(null);
      }
    } catch (err) {
      console.error("Exception fetching tracking data:", err);
      setError("Lỗi kết nối mạng. Vui lòng thử lại sau!");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [orderId]);

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!orderId) return;

    // Create a unique channel for this tracking page instance
    const channelName = `public-tracking-${orderId}-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.warn("[Realtime] Work order updated, fetching fresh tracking data...", payload);
          // Refetch quietly in the background to avoid loading spinner flashes
          fetchTrackingData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-slate-400 font-medium">Đang tải dữ liệu thời gian thực...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi</h2>
        <p className="text-slate-400 max-w-sm mb-6 text-sm">{error || "Không thể tìm thấy phiếu sửa chữa."}</p>
        <Link
          to="/san-pham"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition duration-200 text-sm"
        >
          Trở về Trang chủ Shop
        </Link>
      </div>
    );
  }

  const { workOrder, vehicle, history } = data;

  // Custom warnings for next maintenance calculated dynamically on the fly
  const maintenanceWarnings = vehicle ? checkVehicleMaintenance(vehicle) : [];

  // Helper to get index of active stage
  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case "Tiếp nhận":
        return 0;
      case "Đang sửa":
        return 1;
      case "Đã sửa xong":
        return 2;
      case "Trả máy":
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = getStatusStepIndex(workOrder.status);
  const steps = [
    { label: "Tiếp nhận", desc: "Đã nhận xe & lập biên bản", icon: Clock, color: "text-blue-400" },
    { label: "Đang sửa", desc: "Kỹ thuật viên đang xử lý", icon: Wrench, color: "text-amber-400" },
    { label: "Sửa xong", desc: "Hoàn tất sửa chữa & kiểm thử", icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Đã trả xe", desc: "Khách đã nghiệm thu & nhận xe", icon: ShieldCheck, color: "text-indigo-400" },
  ];

  const toggleHistoryDetail = (id: string) => {
    setShowHistoryDetail((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans pb-12 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Premium glowing backdrops */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[25%] right-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-10 w-60 h-60 bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header Banner */}
      <header className="relative z-10 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 px-4 py-4 sticky top-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Nhạn Lâm SmartCare</h1>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                Live Tracking Active
              </span>
            </div>
          </div>
          <a
            href="tel:0907239337"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/85 flex items-center justify-center shrink-0 transition-colors"
            title="Gọi Hotline hỗ trợ"
          >
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* Ticket Title Card */}
        <section className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/60 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-900/35 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                Phiếu dịch vụ
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-2 font-mono tracking-tight">
                #{workOrder.id.slice(-6).toUpperCase()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Lập lúc: {new Date(workOrder.creationDate).toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-medium uppercase block">Tổng thanh toán</span>
              <span className="text-xl font-black text-emerald-400 tracking-tight block mt-0.5">
                {formatCurrency(workOrder.total)}
              </span>
              <span className={`text-[10px] font-semibold mt-1 inline-block px-2 py-0.5 rounded ${
                workOrder.paymentStatus === "paid"
                  ? "bg-emerald-950/60 border border-emerald-500/20 text-emerald-400"
                  : workOrder.paymentStatus === "partial"
                    ? "bg-amber-950/60 border border-amber-500/20 text-amber-400"
                    : "bg-rose-950/60 border border-rose-500/20 text-rose-400"
              }`}>
                {workOrder.paymentStatus === "paid"
                  ? "Đã thanh toán"
                  : workOrder.paymentStatus === "partial"
                    ? "Đã trả một phần"
                    : "Chưa thanh toán"}
              </span>
            </div>
          </div>

          {/* Quick Vehicle Info inside Banner */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 text-[11px] block">Phương tiện</span>
              <span className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {workOrder.vehicleModel || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Biển kiểm soát</span>
              <span className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono">
                  {workOrder.licensePlate || "N/A"}
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* Real-time Status Tracker */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
          <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            TIẾN ĐỘ SỬA CHỮA THỜI GIAN THỰC
          </h3>

          <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;
              const isFuture = idx > currentStep;

              return (
                <div key={idx} className="relative transition-all duration-300">
                  {/* Circle Indicator */}
                  <div
                    className={`absolute -left-8 top-0.5 w-7.5 h-7.5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "bg-slate-900 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] z-10"
                        : isCompleted
                          ? "bg-blue-600 border-blue-600 z-10"
                          : "bg-slate-900 border-slate-800 z-10"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive
                          ? "text-blue-400 animate-pulse"
                          : isCompleted
                            ? "text-white"
                            : "text-slate-600"
                      }`}
                    />
                  </div>

                  {/* Text Content */}
                  <div>
                    <h4
                      className={`text-sm font-bold tracking-tight ${
                        isActive
                          ? "text-blue-400"
                          : isCompleted
                            ? "text-slate-200"
                            : "text-slate-500"
                      }`}
                    >
                      {step.label}
                      {isActive && (
                        <span className="ml-2 text-[9px] bg-blue-900/40 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-normal uppercase animate-pulse">
                          Đang diễn ra
                        </span>
                      )}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Current Work Order Details (Parts and Services used) */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            CHI TIẾT DỊCH VỤ ĐANG THỰC HIỆN
          </h3>

          <div className="space-y-3.5">
            {/* Parts Used */}
            {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Phụ tùng lắp ráp</span>
                <div className="divide-y divide-slate-800/50 bg-slate-950/30 border border-slate-850 rounded-xl px-3.5 py-1">
                  {workOrder.partsUsed.map((p, idx) => (
                    <div key={idx} className="flex justify-between py-2.5 text-xs">
                      <div>
                        <span className="text-slate-200 font-semibold">{p.partName}</span>
                        <span className="text-slate-500 ml-1.5">x{p.quantity}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{formatCurrency(p.price * p.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Services */}
            {workOrder.additionalServices && workOrder.additionalServices.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gia công & Tiền công dịch vụ</span>
                <div className="divide-y divide-slate-800/50 bg-slate-950/30 border border-slate-850 rounded-xl px-3.5 py-1">
                  {workOrder.additionalServices.map((s, idx) => (
                    <div key={idx} className="flex justify-between py-2.5 text-xs">
                      <div>
                        <span className="text-slate-200 font-semibold">{s.description}</span>
                        <span className="text-slate-500 ml-1.5">x{s.quantity || 1}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{formatCurrency((s.price || 0) * (s.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor cost (Tiền công mặc định nếu có) */}
            {workOrder.laborCost > 0 && (
              <div className="flex justify-between items-center py-1 text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Phí công thợ sửa chữa</span>
                <span className="text-slate-350 font-mono">{formatCurrency(workOrder.laborCost)}</span>
              </div>
            )}

            {/* Issue Description display */}
            {workOrder.issueDescription && (
              <div className="bg-slate-950/30 rounded-xl p-3 border border-slate-800/40 text-xs">
                <span className="text-slate-400 block font-semibold mb-1">Mô tả sự cố & yêu cầu:</span>
                <p className="text-slate-300 leading-relaxed italic">"{workOrder.issueDescription}"</p>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Maintenance Warning Alerts */}
        {maintenanceWarnings.length > 0 && (
          <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              CẢNH BÁO BẢO DƯỠNG XE CỦA BẠN
            </h3>
            
            <div className="text-[11px] text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-850 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Số liệu dự báo được tính toán tự động dựa trên số Km hiện tại ghi nhận của xe: <strong className="text-white font-semibold font-mono">{formatKm(vehicle.currentKm || 0)}</strong>.</span>
            </div>

            <div className="space-y-3">
              {maintenanceWarnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-300 ${
                    w.isOverdue
                      ? "bg-red-950/20 border-red-500/25"
                      : "bg-amber-950/20 border-amber-500/20"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                    w.isOverdue ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {w.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{w.name}</h4>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        w.isOverdue ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {w.isOverdue ? "Quá hạn" : "Sắp tới hạn"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {w.isOverdue
                        ? `Bạn đã đi quá chu kỳ bảo dưỡng ${formatKm(w.kmSinceLastService - (w.kmSinceLastService - w.kmUntilDue * -1)) || ""}!`
                        : `Còn khoảng ${formatKm(w.kmUntilDue)} nữa là tới hạn thực hiện.`}
                    </p>
                    {w.lastServiceKm && (
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Lần cuối thực hiện tại: {formatKm(w.lastServiceKm)} ({w.lastServiceDate ? formatDate(w.lastServiceDate) : ""})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed Repairs History Timeline */}
        {history && history.length > 0 && (
          <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              LỊCH SỬ BẢO DƯỠNG XE ({history.length} LẦN)
            </h3>

            <div className="space-y-3">
              {history.map((h, idx) => {
                const isOpen = !!showHistoryDetail[h.id];
                return (
                  <div
                    key={h.id}
                    className="bg-slate-950/20 border border-slate-850 rounded-xl overflow-hidden transition-all duration-300"
                  >
                    {/* Header Summary */}
                    <button
                      onClick={() => toggleHistoryDetail(h.id)}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-800/10 transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {new Date(h.creationDate).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                          Odo: {h.currentKm ? formatKm(h.currentKm) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {formatCurrency(h.total)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                          isOpen ? "transform rotate-180" : ""
                        }`} />
                      </div>
                    </button>

                    {/* Detailed Content Expanded */}
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-800/50 text-xs text-slate-300 space-y-2.5 bg-slate-950/40">
                        {h.issueDescription && (
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Triệu chứng ban đầu:</span>
                            <p className="italic text-slate-400 mt-0.5">"{h.issueDescription}"</p>
                          </div>
                        )}
                        
                        {/* Parts Changed */}
                        {h.partsUsed && h.partsUsed.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase mb-1">Phụ tùng đã ráp:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                              {h.partsUsed.map((p: any, pIdx: number) => (
                                <li key={pIdx}>
                                  {p.partName || p.partname} <span className="text-[10px] text-slate-500">(x{p.quantity})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Services performed */}
                        {h.additionalServices && h.additionalServices.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase mb-1">Dịch vụ - gia công:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                              {h.additionalServices.map((s: any, sIdx: number) => (
                                <li key={sIdx}>
                                  {s.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 flex justify-between">
                          <span>Thợ sửa: {h.technicianName || "N/A"}</span>
                          <span className="font-mono">ID: {h.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Support Note Footer */}
        <footer className="text-center space-y-3 pt-6 border-t border-slate-850">
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Hệ thống quản lý dịch vụ bảo dưỡng sửa chữa ô tô - xe máy chuyên nghiệp <strong>Motocare Pro</strong>. Mọi thắc mắc về phiếu thu vui lòng liên hệ hotline chi nhánh.
          </p>
          <div className="flex justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span className="text-[9px] text-blue-400 uppercase tracking-widest font-bold">Secured & Powered by Supabase</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
