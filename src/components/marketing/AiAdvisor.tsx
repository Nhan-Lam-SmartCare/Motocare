import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  Cpu,
  Package,
  TrendingUp,
  MessageSquare,
  Video,
  Copy,
  Plus,
  ArrowRight,
  UserCheck,
  Check,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useAiModels, useGenerateAiAction, useAiKeys } from "../../hooks/useAiRepository";
import { showToast } from "../../utils/toast";
import { useParts, useSales, useWorkOrders, useCustomers, useSuppliers } from "../../hooks/useSupabase";
import type { CartItem, WorkOrderPart } from "../../types";
import { useMarketingVideos, useCreateMarketingIdea } from "../../hooks/useMarketingRepository";
import { useAppContext } from "../../contexts/AppContext";
import { useCreatePurchaseOrder } from "../../hooks/usePurchaseOrders";
import { useCreateRepairTemplate, RepairTemplatePart } from "../../hooks/useRepairTemplatesRepository";
import { supabase } from "../../supabaseClient";

type AdvisorTab = "purchasing" | "sales" | "marketing" | "customer" | "revenue";

export const AiAdvisor: React.FC = () => {
  const { currentBranchId } = useAppContext();
  const [activeTab, setActiveTab] = useState<AdvisorTab>("purchasing");
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
  const [loading, setLoading] = useState<Record<AdvisorTab, boolean>>({
    purchasing: false,
    sales: false,
    marketing: false,
    customer: false,
    revenue: false,
  });

  const [advices, setAdvices] = useState<Record<AdvisorTab, any>>({
    purchasing: null,
    sales: null,
    marketing: null,
    customer: null,
    revenue: null,
  });

  // Automated scheduler states
  const [autoFrequency, setAutoFrequency] = useState(() => {
    return localStorage.getItem(`ai_scheduler_freq_${currentBranchId}`) || "off";
  });
  const [runningAuto, setRunningAuto] = useState(false);

  const handleSaveFrequency = (freq: string) => {
    setAutoFrequency(freq);
    localStorage.setItem(`ai_scheduler_freq_${currentBranchId}`, freq);
    showToast.success(`Đã cập nhật lập lịch tự động phân tích: ${
      freq === "daily" ? "Hàng ngày" : freq === "weekly" ? "Hàng tuần" : "Tắt"
    }`);
  };

  // Query real data from repository / Supabase helpers
  const { data: parts = [] } = useParts();
  const { data: sales = [] } = useSales();
  const { data: workOrders = [] } = useWorkOrders();
  const { data: customers = [] } = useCustomers();
  const { data: videos = [] } = useMarketingVideos();
  const { data: suppliers = [] } = useSuppliers();

  // Action Mutations
  const createPOMutation = useCreatePurchaseOrder();
  const createRepairTemplateMutation = useCreateRepairTemplate();
  const createIdeaMutation = useCreateMarketingIdea();

  const { data: models = [] } = useAiModels();
  const { data: keys = [] } = useAiKeys();

  const activeProviders = useMemo(() => {
    return new Set(
      keys
        .filter((k) => k.apiKeyMasked && k.apiKeyMasked !== "••••••••")
        .map((k) => k.provider)
    );
  }, [keys]);

  const activeModels = useMemo(() => {
    const filtered = models.filter((m) => m.isActive && activeProviders.has(m.provider));
    if (filtered.length === 0) {
      return models.filter((m) => m.isActive);
    }
    return filtered;
  }, [models, activeProviders]);

  useEffect(() => {
    if (activeModels.length === 0) return;
    if (activeModels.some((m) => m.modelName === selectedModel)) return;

    const preferredModel =
      activeModels.find((m) => m.modelName === "gemini-3.1-flash-lite") ||
      activeModels.find((m) => m.modelName === "gemini-2.5-flash") ||
      activeModels.find((m) => m.modelName === "gemini-3.5-flash") ||
      activeModels.find((m) => m.modelName === "gpt-4o") ||
      activeModels[0];

    setSelectedModel(preferredModel.modelName);
  }, [activeModels, selectedModel]);

  const generateAction = useGenerateAiAction();

  const computeVariables = (tabKey: AdvisorTab) => {
    let featureName = "";
    let vars: Record<string, any> = {};

    if (tabKey === "purchasing") {
      featureName = "purchasing_advisor";
      const branchSales = sales.filter((s) => (s.branchId || s.branchid) === currentBranchId);
      const branchWorkOrders = workOrders.filter((w) => (w.branchId || w.branchid) === currentBranchId);

      // Compute 30 days consumption count for each part SKU
      const partConsumption30d: Record<string, number> = {};
      branchSales.forEach((s) => {
        s.items?.forEach((item: CartItem) => {
          if (item.sku) {
            partConsumption30d[item.sku] = (partConsumption30d[item.sku] || 0) + item.quantity;
          }
        });
      });
      branchWorkOrders.forEach((w) => {
        w.partsUsed?.forEach((p: WorkOrderPart) => {
          const matchedPart = parts.find((pt) => pt.id === p.partId || pt.name === p.partName);
          if (matchedPart?.sku) {
            partConsumption30d[matchedPart.sku] = (partConsumption30d[matchedPart.sku] || 0) + p.quantity;
          }
        });
      });

      const lowStockParts = parts
        .filter((p) => {
          const qty = p.stock?.[currentBranchId] ?? 0;
          const min = p.minstock?.[currentBranchId] ?? 5;
          return qty <= min;
        })
        .slice(0, 15)
        .map((p) => {
          const qty = p.stock?.[currentBranchId] ?? 0;
          const min = p.minstock?.[currentBranchId] ?? 5;
          return {
            name: p.name,
            sku: p.sku,
            currentStock: qty,
            minStock: min,
            salesVolume30d: partConsumption30d[p.sku] ?? 0,
          };
        });
      const availableSuppliers = suppliers.map((s) => ({
        id: s.id,
        name: s.name,
      }));
      vars = { lowStockParts, suppliers: availableSuppliers, branchId: currentBranchId };
    } else if (tabKey === "sales") {
      featureName = "sales_advisor";
      const branchSales = sales.filter((s) => (s.branchId || s.branchid) === currentBranchId);
      const branchWorkOrders = workOrders.filter((w) => (w.branchId || w.branchid) === currentBranchId);

      const itemsCount: Record<string, number> = {};
      branchSales.forEach((s) => {
        s.items?.forEach((item: CartItem) => {
          itemsCount[item.partName] = (itemsCount[item.partName] || 0) + item.quantity;
        });
      });
      branchWorkOrders.forEach((w) => {
        w.partsUsed?.forEach((p: WorkOrderPart) => {
          itemsCount[p.partName] = (itemsCount[p.partName] || 0) + p.quantity;
        });
        w.additionalServices?.forEach((s: any) => {
          itemsCount[s.description] = (itemsCount[s.description] || 0) + s.quantity;
        });
      });

      const priceMap: Record<string, number> = {};
      parts.forEach((p) => {
        if (p.name) {
          priceMap[p.name] = p.retailPrice?.[currentBranchId] ?? p.retailPrice?.default ?? 0;
        }
      });
      branchWorkOrders.forEach((w) => {
        w.partsUsed?.forEach((p: WorkOrderPart) => {
          if (p.partName && p.price) {
            priceMap[p.partName] = p.price;
          }
        });
        w.additionalServices?.forEach((s: any) => {
          if (s.description && s.price) {
            priceMap[s.description] = s.price;
          }
        });
      });
      branchSales.forEach((s) => {
        s.items?.forEach((item: CartItem) => {
          if (item.partName && item.sellingPrice) {
            priceMap[item.partName] = item.sellingPrice;
          }
        });
      });

      const topSoldItems = Object.entries(itemsCount)
        .map(([name, qty]) => ({ name, quantity: qty, price: priceMap[name] ?? 0 }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20);

      const vehicleCount: Record<string, number> = {};
      branchWorkOrders.forEach((w) => {
        if (w.vehicleModel) {
          const modelNormalized = w.vehicleModel.split(" ")[0].trim();
          vehicleCount[modelNormalized] = (vehicleCount[modelNormalized] || 0) + 1;
        }
      });
      const popularVehicles = Object.entries(vehicleCount)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const currentMonth = new Date().getMonth() + 1;
      const season = (currentMonth >= 5 && currentMonth <= 10) ? "Mùa mưa (ngập lụt, trơn trượt, bùn đất)" : "Mùa khô (nắng nóng, bụi bẩn)";

      vars = { 
        topSoldItems, 
        popularVehicles, 
        currentMonth, 
        season, 
        branchId: currentBranchId 
      };
    } else if (tabKey === "marketing") {
      featureName = "marketing_advisor";
      const branchWorkOrders = workOrders.filter((w) => (w.branchId || w.branchid) === currentBranchId);
      const vehicleCount: Record<string, number> = {};
      branchWorkOrders.forEach((w) => {
        if (w.vehicleModel) {
          const modelNormalized = w.vehicleModel.split(" ")[0].trim();
          vehicleCount[modelNormalized] = (vehicleCount[modelNormalized] || 0) + 1;
        }
      });
      const popularVehicles = Object.entries(vehicleCount)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const currentMonth = new Date().getMonth() + 1;
      const season = (currentMonth >= 5 && currentMonth <= 10) ? "Mùa mưa (ngập úng, đường trơn)" : "Mùa khô (bụi bẩn, nhiệt độ cao)";

      const videoSummary = videos
        .slice(0, 10)
        .map((v) => ({
          title: v.title,
          views: v.views || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          conversionCount: v.visitors || 0,
        }));
      vars = { 
        videos: videoSummary, 
        popularVehicles, 
        currentMonth, 
        season, 
        branchId: currentBranchId 
      };
    } else if (tabKey === "customer") {
      featureName = "customer_advisor";
      const careCandidates = customers
        .filter((c) => {
          if (!c.lastVisit) return true;
          const days = (Date.now() - new Date(c.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
          return days > 90;
        })
        .slice(0, 15)
        .map((c) => ({
          name: c.name,
          phone: c.phone || "",
          lastVisit: c.lastVisit || "Chưa có",
          vehicleModel: c.vehicleModel || (c.vehicles && c.vehicles[0]?.model) || "Không rõ",
          totalSpent: c.totalSpent || 0,
          visitCount: c.visitCount || 0,
          segment: c.segment || "Bình thường",
        }));
      vars = { candidates: careCandidates, branchId: currentBranchId };
    } else if (tabKey === "revenue") {
      featureName = "revenue_advisor";
      const branchSales = sales.filter((s) => (s.branchId || s.branchid) === currentBranchId);
      const branchWorkOrders = workOrders.filter((w) => (w.branchId || w.branchid) === currentBranchId);

      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const sevenDaysAgo = now - 7 * oneDayMs;
      const fourteenDaysAgo = now - 14 * oneDayMs;

      const isThisWeek = (dStr: string) => {
        const t = new Date(dStr).getTime();
        return t >= sevenDaysAgo && t <= now;
      };
      const isLastWeek = (dStr: string) => {
        const t = new Date(dStr).getTime();
        return t >= fourteenDaysAgo && t < sevenDaysAgo;
      };

      let thisWeekSalesRev = 0;
      let thisWeekWorkOrdersRev = 0;

      branchSales.forEach((s) => {
        if (isThisWeek(s.date) && s.delivery_status !== "cancelled" && !s.refunded) {
          thisWeekSalesRev += s.total || 0;
        }
      });

      branchWorkOrders.forEach((w) => {
        if (isThisWeek(w.paymentDate || w.creationDate) && w.status !== "Đã hủy" && !w.refunded) {
          thisWeekWorkOrdersRev += w.total || 0;
        }
      });

      let lastWeekSalesRev = 0;
      let lastWeekWorkOrdersRev = 0;

      branchSales.forEach((s) => {
        if (isLastWeek(s.date) && s.delivery_status !== "cancelled" && !s.refunded) {
          lastWeekSalesRev += s.total || 0;
        }
      });

      branchWorkOrders.forEach((w) => {
        if (isLastWeek(w.paymentDate || w.creationDate) && w.status !== "Đã hủy" && !w.refunded) {
          lastWeekWorkOrdersRev += w.total || 0;
        }
      });

      const thisWeekTotal = thisWeekSalesRev + thisWeekWorkOrdersRev;
      const lastWeekTotal = lastWeekSalesRev + lastWeekWorkOrdersRev;

      const weeklyStats = {
        thisWeekTotal,
        lastWeekTotal,
        thisWeekSalesTotal: thisWeekSalesRev,
        thisWeekWorkOrdersTotal: thisWeekWorkOrdersRev,
        lastWeekSalesTotal: lastWeekSalesRev,
        lastWeekWorkOrdersTotal: lastWeekWorkOrdersRev,
      };

      const popularParts = parts
        .slice(0, 15)
        .map((p) => {
          const cost = p.costPrice?.[currentBranchId] || p.costPrice?.default || Math.round((p.retailPrice?.[currentBranchId] || 0) / 1.4);
          const retail = p.retailPrice?.[currentBranchId] || p.retailPrice?.default || 0;
          return {
            name: p.name,
            sku: p.sku,
            costPrice: cost,
            retailPrice: retail,
            marginPercentage: retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0,
          };
        });

      vars = { weeklyStats, popularParts, branchId: currentBranchId };
    }

    return { featureName, vars };
  };

  const handleFetchAdvice = async (tabKey: AdvisorTab) => {
    setLoading((prev) => ({ ...prev, [tabKey]: true }));
    try {
      const { featureName, vars } = computeVariables(tabKey);

      const result = await generateAction.mutateAsync({
        feature: featureName,
        modelName: selectedModel,
        variables: vars,
      });

      setAdvices((prev) => ({ ...prev, [tabKey]: result }));
      showToast.success("AI phân tích dữ liệu hoàn tất!");
    } catch (err: any) {
      showToast.error("Lỗi AI Advisor: " + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, [tabKey]: false }));
    }
  };

  // Automated background analysis worker
  useEffect(() => {
    if (autoFrequency === "off" || runningAuto) return;
    if (parts.length === 0 || sales.length === 0 || workOrders.length === 0) return;

    const lastRunStr = localStorage.getItem(`last_ai_auto_run_${currentBranchId}`);
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    const now = Date.now();

    const intervalMs = autoFrequency === "daily" 
      ? 24 * 60 * 60 * 1000 
      : 7 * 24 * 60 * 60 * 1000;

    if (now - lastRun >= intervalMs) {
      const runBackgroundAnalysis = async () => {
        setRunningAuto(true);
        showToast.info("🤖 SmartCare AI đang tự động chạy phân tích định kỳ cho chi nhánh...");

        try {
          const tabs: AdvisorTab[] = ["purchasing", "sales", "marketing", "customer", "revenue"];
          const results: Record<string, any> = {};

          for (const tab of tabs) {
            const { featureName, vars } = computeVariables(tab);
            try {
              const res = await generateAction.mutateAsync({
                feature: featureName,
                modelName: selectedModel,
                variables: vars,
              });
              results[tab] = res;
            } catch (e) {
              console.error(`Error running automated AI analysis for ${tab}:`, e);
            }
          }

          // Write results to database notification table if they succeeded
          if (results.purchasing) {
            await supabase.from("notifications").insert({
              type: "inventory_warning",
              title: "📦 [AI Advisor] Đề xuất nhập hàng định kỳ",
              message: `Tóm tắt tồn kho: ${results.purchasing.overallSummary || "AI đã phát hiện sản phẩm sắp hết hàng."} Cần nhập nháp thêm ${results.purchasing.adviceList?.length || 0} sản phẩm.`,
              data: results.purchasing,
              branch_id: currentBranchId,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }

          if (results.sales) {
            await supabase.from("notifications").insert({
              type: "sale",
              title: "📈 [AI Advisor] Đề xuất combo bán hàng mới",
              message: `Khuyến nghị tăng trưởng: ${results.sales.highMarginOpportunities || "Tối ưu hóa doanh số bằng combo dịch vụ."} Gợi ý tạo ${results.sales.combos?.length || 0} gói combo.`,
              data: results.sales,
              branch_id: currentBranchId,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }

          if (results.customer) {
            await supabase.from("notifications").insert({
              type: "work_order",
              title: "🤝 [AI Advisor] Nhắc lịch hẹn chăm sóc",
              message: `Chiến lược CSKH: ${results.customer.generalStrategy || "Liên hệ nhắc lịch hẹn bảo dưỡng định kỳ."} Đã soạn sẵn tin nhắn cho ${results.customer.customersToCare?.length || 0} khách hàng.`,
              data: results.customer,
              branch_id: currentBranchId,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }

          if (results.revenue) {
            await supabase.from("notifications").insert({
              type: "cash",
              title: "📊 [AI Advisor] Phân tích doanh thu định kỳ",
              message: `Doanh thu tuần này đạt ${(results.revenue.revenueAnalysis?.thisWeekTotal || 0).toLocaleString()} đ (${(results.revenue.revenueAnalysis?.growthRate || 0) >= 0 ? "+" : ""}${results.revenue.revenueAnalysis?.growthRate || 0}% so với tuần trước). ${results.revenue.revenueAnalysis?.analysisText || ""}`,
              data: results.revenue,
              branch_id: currentBranchId,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }

          localStorage.setItem(`last_ai_auto_run_${currentBranchId}`, now.toString());
          showToast.success("🤖 SmartCare AI hoàn thành phân tích định kỳ và đã đẩy các đề xuất chiến lược vào hộp thư!");
        } catch (err) {
          console.error("Failed to run background periodic AI analysis:", err);
        } finally {
          setRunningAuto(false);
        }
      };

      runBackgroundAnalysis();
    }
  }, [parts.length, sales.length, workOrders.length, autoFrequency, currentBranchId, selectedModel]);

  // Auto load when tab changes and has no data yet
  useEffect(() => {
    if (!advices[activeTab] && !loading[activeTab]) {
      handleFetchAdvice(activeTab);
    }
  }, [activeTab]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast.success("Đã sao chép tin nhắn mẫu!");
  };

  const handleCreateDraftPO = async (item: any) => {
    const matchedPart = parts.find((p) => p.name === item.partName || p.sku === item.sku);
    if (!matchedPart) {
      showToast.error("Không tìm thấy phụ tùng này trong hệ thống!");
      return;
    }

    let supplierId = matchedPart.preferred_supplier_id;
    if (!supplierId && suppliers.length > 0) {
      supplierId = suppliers[0].id;
    }

    if (!supplierId) {
      showToast.error("Vui lòng cấu hình ít nhất một Nhà cung cấp trước khi tạo đơn đặt hàng!");
      return;
    }

    try {
      const unitPrice = matchedPart.costPrice?.[currentBranchId] || Math.round((matchedPart.retailPrice?.[currentBranchId] || 0) / 1.4);

      await createPOMutation.mutateAsync({
        supplier_id: supplierId,
        branch_id: currentBranchId,
        notes: `Tự động tạo từ AI Advisor: ${item.reason}`,
        items: [
          {
            part_id: matchedPart.id,
            quantity_ordered: item.suggestedQuantity,
            unit_price: unitPrice || 50000,
            notes: "Yêu cầu tự động từ AI Advisor Hub",
          }
        ]
      });

      showToast.success(`Đã tự động tạo nháp Đơn mua hàng cho: ${item.partName} (SL: ${item.suggestedQuantity})!`);
    } catch (err: any) {
      showToast.error("Không thể tạo đơn đặt hàng: " + err.message);
    }
  };

  const handleCreateComboService = async (item: any) => {
    try {
      const templateParts: RepairTemplatePart[] = (item.partsInvolved || []).map((pName: string) => {
        const matched = parts.find((p) => p.name === pName);
        const price = matched ? matched.retailPrice?.[currentBranchId] || 0 : 50000;
        return {
          name: pName,
          quantity: 1,
          price: price,
          unit: "Cái",
          sku: matched?.sku || "",
          partId: matched?.id || undefined,
        };
      });

      await createRepairTemplateMutation.mutateAsync({
        name: item.comboName,
        description: `Combo đề xuất từ AI Advisor: ${item.reasoning}`,
        duration: 45,
        labor_cost: 100000,
        parts: templateParts,
        is_active: true,
      });
    } catch (err: any) {
      showToast.error("Không thể tạo gói dịch vụ mẫu: " + err.message);
    }
  };

  const handleSendToIdeas = async (item: any) => {
    try {
      await createIdeaMutation.mutateAsync({
        title: item.suggestedTitle,
        vehicleModel: item.targetVehicle,
        topic: item.topic,
        priority: "medium",
        source: "AI Advisor Suggestion",
        status: "draft",
      });
      showToast.success(`Đã thêm ý tưởng video: "${item.suggestedTitle}" vào Content Studio!`);
    } catch (err: any) {
      showToast.error("Không thể tạo ý tưởng video: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-500 animate-pulse" />
            <span>AI Advisor Hub — Đề xuất ra quyết định</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đọc dữ liệu từ cửa hàng để đề xuất quyết định Nhập hàng, Bán hàng, Marketing và Chăm sóc khách hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Automation scheduler panel */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
            <Clock className="w-4 h-4 text-emerald-400 ml-1.5" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Lập lịch AI:</span>
            <select
              value={autoFrequency}
              onChange={(e) => handleSaveFrequency(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none pr-3"
            >
              <option value="off" className="bg-slate-900">Tắt (Thủ công)</option>
              <option value="daily" className="bg-slate-900">Hàng ngày (Tự động)</option>
              <option value="weekly" className="bg-slate-900">Hàng tuần (Tự động)</option>
            </select>
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
            <Cpu className="w-4 h-4 text-purple-400 ml-1.5" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none pr-3"
            >
              {activeModels.map((m) => (
                <option key={m.modelName} value={m.modelName} className="bg-slate-900">
                  {m.displayName}
                </option>
              ))}
              {activeModels.length === 0 && (
                <option value="gpt-4o" className="bg-slate-900">
                  GPT-4o (Default)
                </option>
              )}
            </select>

            <button
              onClick={() => handleFetchAdvice(activeTab)}
              disabled={loading[activeTab]}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition disabled:opacity-50"
              title="Phân tích lại dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading[activeTab] ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "purchasing", label: "📦 Đề xuất Nhập hàng", desc: "Tồn kho dưới hạn mức" },
          { key: "sales", label: "📈 Đề xuất Bán hàng", desc: "Combo & Tăng doanh số" },
          { key: "marketing", label: "🎯 Xu hướng Marketing", desc: "Chuyển đổi video" },
          { key: "customer", label: "🤝 Chăm sóc khách hàng", desc: "Nhắc bảo dưỡng định kỳ" },
          { key: "revenue", label: "📊 Doanh thu & Dự báo", desc: "So sánh & Tối ưu giá" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AdvisorTab)}
              className={`flex-1 min-w-[150px] p-3 text-left border rounded-xl transition ${
                active
                  ? "bg-fuchsia-600/10 border-fuchsia-600/60 text-white"
                  : "bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
              }`}
            >
              <div className="text-xs font-extrabold">{tab.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{tab.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Advisor Content Body */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between">
        {loading[activeTab] ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-fuchsia-600 animate-spin" />
            <span className="text-xs text-slate-500 font-mono">SmartCare AI đang đọc dữ liệu cửa hàng và phân tích...</span>
          </div>
        ) : advices[activeTab] ? (
          <div className="space-y-6">
            {/* 1. PURCHASING TAB */}
            {activeTab === "purchasing" && (
              <div className="space-y-5">
                <div className="bg-fuchsia-500/5 border border-fuchsia-500/10 p-4 rounded-xl text-xs text-fuchsia-400 font-medium">
                  💡 **Nhận định chung**: {advices.purchasing.overallSummary}
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-4 py-3">Phụ tùng đề xuất</th>
                        <th className="px-4 py-3 text-center">Tồn kho / Tối thiểu</th>
                        <th className="px-4 py-3 text-center">Đề xuất nhập</th>
                        <th className="px-4 py-3">Lý do từ AI</th>
                        <th className="px-4 py-3">Nhà cung cấp gợi ý</th>
                        <th className="px-4 py-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                      {advices.purchasing.adviceList?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-850/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white">{item.partName}</td>
                          <td className="px-4 py-3.5 text-center font-mono">
                            <span className="text-red-400">{item.currentStock}</span>
                            <span className="text-slate-600"> / {item.minStock}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-400 font-mono">+{item.suggestedQuantity}</td>
                          <td className="px-4 py-3.5 text-slate-400 leading-relaxed max-w-sm">{item.reason}</td>
                          <td className="px-4 py-3.5 font-medium">{item.recommendedSupplier}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleCreateDraftPO(item)}
                              className="px-2.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-[10.5px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Nhập nháp</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. SALES TAB */}
            {activeTab === "sales" && (
              <div className="space-y-6">
                <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl text-xs text-purple-400 font-medium">
                  📈 **Cơ hội biên lợi nhuận ròng**: {advices.sales.highMarginOpportunities}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {advices.sales.combos?.map((combo: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-white">{combo.comboName}</h4>
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                            Giảm {combo.discountPercentage}%
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Phụ tùng sử dụng:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {combo.partsInvolved.map((p: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded font-medium">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Công dịch vụ:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {combo.servicesInvolved.map((s: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-450 leading-relaxed pt-2 border-t border-slate-850/60">
                          {combo.reasoning}
                        </p>
                      </div>

                      <div className="flex justify-between items-center gap-4 mt-5 pt-3 border-t border-slate-800">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">Giá trọn gói gợi ý</span>
                          <span className="text-xs font-extrabold text-white">
                            {(combo.targetPrice as number).toLocaleString()} đ
                          </span>
                        </div>
                        <button
                          onClick={() => handleCreateComboService(combo)}
                          className="px-3 py-1.5 bg-purple-650 hover:bg-purple-750 text-white rounded text-[11px] font-bold transition flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo gói dịch vụ mẫu</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MARKETING TAB */}
            {activeTab === "marketing" && (
              <div className="space-y-5">
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl text-xs text-indigo-400 font-medium">
                  🎯 **Phân tích chiến lược tiếp thị**: {advices.marketing.campaignStrategy}
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest block">
                    Đề xuất 2 chủ đề video hot nhất
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advices.marketing.suggestedVideos?.map((vid: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <span className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-850 text-indigo-400 text-[9.5px] font-bold rounded">
                              DÒNG XE: {vid.targetVehicle}
                            </span>
                            <span className="text-[10px] text-slate-500 italic font-medium">{vid.topic}</span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug">"{vid.suggestedTitle}"</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{vid.videoBrief}</p>
                        </div>

                        <button
                          onClick={() => handleSendToIdeas(vid)}
                          className="w-full mt-5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span>Gửi sang Ý tưởng (Studio)</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. CUSTOMER TAB */}
            {activeTab === "customer" && advices.customer && (
              <div className="space-y-5">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400 font-medium">
                  🤝 **Chiến lược chăm sóc**: {advices.customer.generalStrategy}
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest block">
                    Danh sách khách hàng đề xuất nhắc hẹn bảo dưỡng
                  </h3>

                  <div className="space-y-3.5">
                    {advices.customer.customersToCare?.map((cust: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900 border border-slate-850 p-5 rounded-xl hover:border-slate-800 transition flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{cust.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({cust.phoneNumber})</span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] rounded font-mono">
                              {cust.vehicleModel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-slate-400 font-sans">
                            <div>
                              <span className="text-slate-500 font-semibold">Bảo dưỡng lần cuối:</span>{" "}
                              {cust.lastVisitDate}
                            </div>
                            <div>
                              <span className="text-slate-500 font-semibold">Tình trạng đề xuất:</span>{" "}
                              <span className="text-fuchsia-400 font-bold">{cust.dueService}</span>
                            </div>
                          </div>

                          {/* Message box */}
                          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-[11px] text-emerald-400 font-sans leading-relaxed relative italic">
                            "{cust.aiMessageDraft}"
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopyText(cust.aiMessageDraft)}
                          className="px-3.5 py-2 bg-emerald-650 hover:bg-emerald-750 text-white rounded text-[11px] font-bold transition flex items-center justify-center gap-1.5 self-start xl:self-center"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy tin nhắn Zalo</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. REVENUE TAB */}
            {activeTab === "revenue" && advices.revenue && (
              <div className="space-y-6">
                {/* Weekly Comparison Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Doanh thu tuần này</span>
                    <span className="text-xl font-extrabold text-white mt-1 block">
                      {(advices.revenue.revenueAnalysis?.thisWeekTotal || 0).toLocaleString()} đ
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Doanh thu tuần trước</span>
                    <span className="text-xl font-extrabold text-slate-400 mt-1 block">
                      {(advices.revenue.revenueAnalysis?.lastWeekTotal || 0).toLocaleString()} đ
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Tăng trưởng tuần</span>
                    <span className={`text-xl font-extrabold mt-1 block ${(advices.revenue.revenueAnalysis?.growthRate || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(advices.revenue.revenueAnalysis?.growthRate || 0) >= 0 ? "+" : ""}
                      {advices.revenue.revenueAnalysis?.growthRate}%
                    </span>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl text-xs text-blue-400 font-medium leading-relaxed">
                  📊 **Nhận định tài chính từ AI**: {advices.revenue.revenueAnalysis?.analysisText}
                </div>

                {/* Demand Forecast Section */}
                <div className="space-y-3">
                  <h3 className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest block">
                    Dự báo nhu cầu 15-30 ngày tới
                  </h3>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3">Sản phẩm / Dịch vụ</th>
                          <th className="px-4 py-3 text-center">Nhu cầu dự đoán</th>
                          <th className="px-4 py-3">Lý giải từ AI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                        {advices.revenue.demandForecast?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/30 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-white">{item.item}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.forecastedDemand === "Cao"
                                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                                  : item.forecastedDemand === "Trung bình"
                                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}>
                                {item.forecastedDemand}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-400 leading-relaxed">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Price Optimization Section */}
                <div className="space-y-3">
                  <h3 className="text-[10.5px] font-bold text-slate-450 uppercase tracking-widest block">
                    Đề xuất điều chỉnh giá bán tối ưu (Price Optimization)
                  </h3>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="px-4 py-3">Sản phẩm / Dịch vụ</th>
                          <th className="px-4 py-3 text-center">Giá hiện tại</th>
                          <th className="px-4 py-3 text-center">Giá đề xuất</th>
                          <th className="px-4 py-3 text-center">Mức thay đổi</th>
                          <th className="px-4 py-3">Chiến lược & Lý do tối ưu hóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                        {advices.revenue.priceOptimization?.map((item: any, idx: number) => {
                          const diff = item.proposedPrice - item.currentPrice;
                          const pct = item.currentPrice > 0 ? Math.round((diff / item.currentPrice) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-850/30 transition-colors">
                              <td className="px-4 py-3.5 font-bold text-white">{item.item}</td>
                              <td className="px-4 py-3.5 text-center font-mono">{item.currentPrice?.toLocaleString()} đ</td>
                              <td className="px-4 py-3.5 text-center font-bold text-emerald-400 font-mono">{item.proposedPrice?.toLocaleString()} đ</td>
                              <td className={`px-4 py-3.5 text-center font-bold font-mono ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {diff >= 0 ? "+" : ""}
                                {pct}%
                              </td>
                              <td className="px-4 py-3.5 text-slate-400 leading-relaxed">{item.strategy}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-500">
            <Sparkles className="w-10 h-10 mb-3 text-slate-600 animate-pulse" />
            <p className="text-xs">Chưa có kết quả phân tích AI Advisor.</p>
            <button
              onClick={() => handleFetchAdvice(activeTab)}
              className="mt-4 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yêu cầu AI phân tích ngay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
