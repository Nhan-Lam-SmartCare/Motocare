import React, { useState, useMemo, useCallback } from "react";
import { FileText, Download, Info, FileSpreadsheet } from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { useSalesRepo } from "../../hooks/useSalesRepository";
import { useWorkOrders } from "../../hooks/useSupabase";
import { useCashTxRepo } from "../../hooks/useCashTransactionsRepository";
import { useParts } from "../../hooks/useSupabase";
import { showToast } from "../../utils/toast";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  exportVATReportXML,
  exportRevenueXML,
  prepareVATReportData,
  type OrganizationTaxInfo,
} from "../../utils/taxReportXML";
import { exportS1aHKD, type BusinessInfo } from "../../utils/excelExport";
import { calculateFinancialSummary, getWorkOrderAccountingDate } from "../../lib/reports/financialSummary";

/**
 * TAX REPORT EXPORT COMPONENT
 * Component để xuất báo cáo thuế theo định dạng XML chuẩn Tổng cục Thuế
 */

const TaxReportExport: React.FC = () => {
  const { currentBranchId } = useAppContext();

  // Fetch data - sử dụng cùng nguồn với ReportsManager
  const { data: salesData = [] } = useSalesRepo();
  const { data: workOrdersData = [] } = useWorkOrders();
  const { data: cashTxData = [] } = useCashTxRepo({
    branchId: currentBranchId,
  });
  const { data: partsData = [] } = useParts();

  // State
  const [reportType, setReportType] = useState<"vat" | "revenue" | "s1a-hkd">("s1a-hkd");
  const [periodType, setPeriodType] = useState<"month" | "quarter">("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(
    Math.floor(new Date().getMonth() / 3) + 1
  );

  // Organization info (should be fetched from settings)
  const organizationInfo: OrganizationTaxInfo = useMemo(
    () => ({
      taxCode: "0123456789", // TODO: Fetch from settings
      name: "CÔNG TY TNHH MOTOCARE",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      phone: "028.1234.5678",
      email: "contact@motocare.vn",
      taxAuthority: "Cục Thuế TP. Hồ Chí Minh",
      taxDepartment: "Chi cục Thuế Quận 1",
      legalRepresentative: "Nguyễn Văn A",
      accountantName: "Trần Thị B",
      accountantPhone: "090.123.4567",
    }),
    []
  );

  // Business info for S1a-HKD (Hộ kinh doanh)
  const businessInfo: BusinessInfo = {
    businessName: "Hộ kinh doanh MOTOCARE", // TODO: Fetch from settings
    taxCode: "0123456789",
    address: "123 Đường ABC, Quận 1, TP.HCM",
    businessLocation: "123 Đường ABC, Quận 1, TP.HCM",
  };

  // Calculate date range
  const getDateRange = useCallback(() => {
    let startDate: Date;
    let endDate: Date;

    if (periodType === "month") {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 0);
    } else {
      // Quarter
      const quarterStartMonth = (selectedQuarter - 1) * 3;
      startDate = new Date(selectedYear, quarterStartMonth, 1);
      endDate = new Date(selectedYear, quarterStartMonth + 3, 0);
    }

    return { startDate, endDate };
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  // Filter data by date range
  // Chỉ lấy dữ liệu đã thanh toán/hoàn thành để tính doanh thu
  const getFilteredData = useCallback(() => {
    const { startDate, endDate } = getDateRange();

    const filteredSales = salesData.filter((sale) => {
      // Chỉ lấy đơn hàng đã hoàn thành (không bị hủy/hoàn tiền)
      const status = (sale as any).status;
      if (status === "cancelled" || status === "refunded") {
        return false;
      }
      
      const saleBranchId = (sale as any).branchId || (sale as any).branchid;
      if (saleBranchId && currentBranchId && saleBranchId !== currentBranchId) {
        return false;
      }
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const filteredWorkOrders = workOrdersData.filter((wo: any) => {
      const status = String(wo.paymentStatus ?? wo.paymentstatus ?? "").toLowerCase();
      const totalPaid = Number(wo.totalPaid ?? wo.totalpaid ?? 0);
      const isPaidLike = status === "paid" || status === "partial" || totalPaid > 0;
      if (!isPaidLike) {
        return false;
      }
      
      const woBranchId = wo.branchId || wo.branchid;
      if (woBranchId && currentBranchId && woBranchId !== currentBranchId) {
        return false;
      }
      const woDate = getWorkOrderAccountingDate(wo);
      return woDate && woDate >= startDate && woDate <= endDate;
    });

    const filteredCashTx = cashTxData.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= startDate && txDate <= endDate;
    });

    return {
      sales: filteredSales,
      workOrders: filteredWorkOrders,
      cashTransactions: filteredCashTx,
    };
  }, [getDateRange, salesData, workOrdersData, cashTxData, currentBranchId]);

  // Calculate preview stats - dùng cùng logic với ReportsManager
  const previewStats = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    
    // Sử dụng calculateFinancialSummary giống ReportsManager
    const financialSummary = calculateFinancialSummary({
      sales: salesData,
      workOrders: workOrdersData,
      parts: partsData,
      cashTransactions: cashTxData,
      branchId: currentBranchId,
      start: startDate,
      end: endDate,
    });

    if (reportType === "s1a-hkd") {
      // Hộ kinh doanh 2026 (Thông tư 40/2021/TT-BTC, Nghị định 68/2026/NĐ-CP)
      // Phân biệt thuế suất theo loại doanh thu:
      // - Bán phụ tùng / hàng hóa: 1% GTGT + 0.5% TNCN = 1.5%
      // - Dịch vụ sửa chữa (có tiền công): 3% GTGT + 1.5% TNCN = 4.5%
      //
      // Phiếu sửa chữa (Work Order) cần phân biệt:
      //   + Có tiền công (laborCost > 0) → thuế dịch vụ 4.5%
      //   + Chỉ bán phụ tùng (laborCost = 0) → thuế hàng hóa 1.5%

      const totalRevenue = financialSummary.totalRevenue;
      const transactionCount = financialSummary.salesCount + financialSummary.workOrdersCount;

      // Tách Work Orders thành 2 nhóm dựa trên tiền công
      const filteredWOs = financialSummary.filteredWorkOrders as any[];
      let woServiceRevenue = 0; // WO có tiền công → dịch vụ
      let woServiceCount = 0;
      let woGoodsRevenue = 0;  // WO chỉ bán phụ tùng → hàng hóa
      let woGoodsCount = 0;

      filteredWOs.forEach((wo: any) => {
        const laborCost = Number(wo.laborCost ?? wo.laborcost ?? wo.labor_cost ?? 0);
        const woTotal = Number(wo.totalPaid ?? wo.totalpaid ?? wo.total ?? 0);
        if (laborCost > 0) {
          woServiceRevenue += woTotal;
          woServiceCount++;
        } else {
          woGoodsRevenue += woTotal;
          woGoodsCount++;
        }
      });

      // Tổng doanh thu hàng hóa = Sales + WO chỉ bán phụ tùng
      const goodsRevenue = financialSummary.salesRevenue + woGoodsRevenue;
      const goodsCount = financialSummary.salesCount + woGoodsCount;

      // Thuế hàng hóa: 1% GTGT + 0.5% TNCN
      const goodsGTGT = Math.round(goodsRevenue * 1 / 100);
      const goodsTNCN = Math.round(goodsRevenue * 0.5 / 100);
      const goodsTax = goodsGTGT + goodsTNCN;

      // Thuế dịch vụ sửa chữa (có tiền công): 3% GTGT + 1.5% TNCN
      const serviceGTGT = Math.round(woServiceRevenue * 3 / 100);
      const serviceTNCN = Math.round(woServiceRevenue * 1.5 / 100);
      const serviceTax = serviceGTGT + serviceTNCN;

      const totalTax = goodsTax + serviceTax;

      return {
        totalRevenue,
        totalVAT: totalTax,
        transactionCount,
        taxRate: 0, // mixed rates
        financialSummary,
        // Chi tiết tách riêng
        goodsRevenue,
        goodsTax,
        goodsGTGT,
        goodsTNCN,
        goodsCount,
        woServiceRevenue,
        serviceTax,
        serviceGTGT,
        serviceTNCN,
        woServiceCount,
      };
    }

    const vatData = prepareVATReportData(
      financialSummary.filteredSales,
      financialSummary.filteredWorkOrders,
      getFilteredData().cashTransactions,
      organizationInfo,
      startDate,
      endDate
    );

    const totalRevenueBeforeVAT = vatData.outputVAT.totalRevenue;
    const totalVAT = vatData.outputVAT.vatAmount;
    const transactionCount = vatData.outputVAT.transactions.length;

    return { 
      totalRevenue: totalRevenueBeforeVAT, 
      totalVAT, 
      transactionCount,
      taxRate: 10,
      // Lưu thêm để export
      financialSummary,
    };
  }, [
    salesData,
    workOrdersData,
    cashTxData,
    partsData,
    currentBranchId,
    getDateRange,
    getFilteredData,
    organizationInfo,
    reportType,
  ]);

  // Handle export
  const handleExport = () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      // Sử dụng dữ liệu đã lọc đúng từ financialSummary
      const { financialSummary } = previewStats;
      const sales = financialSummary.filteredSales;
      const workOrders = financialSummary.filteredWorkOrders;
      const { cashTransactions } = getFilteredData();

      if (sales.length === 0 && workOrders.length === 0) {
        showToast.warning("Không có dữ liệu trong kỳ này!");
        return;
      }

      let result;

      if (reportType === "s1a-hkd") {
        // Export S1a-HKD Excel (Hộ kinh doanh dưới 500 triệu/năm)
        result = exportS1aHKD(
          sales,
          workOrders,
          businessInfo,
          startDate,
          endDate
        );
        showToast.success(
          `Đã xuất sổ doanh thu S1a-HKD: ${result.fileName}\nTổng doanh thu: ${formatCurrency(result.totalRevenue)}`
        );
      } else if (reportType === "vat") {
        result = exportVATReportXML(
          sales,
          workOrders,
          cashTransactions,
          organizationInfo,
          startDate,
          endDate
        );
        showToast.success(
          `Đã xuất tờ khai VAT: ${
            result.fileName
          }\nThuế phải nộp: ${formatCurrency(result.vatPayable)}`
        );
      } else {
        result = exportRevenueXML(
          sales,
          workOrders,
          organizationInfo,
          startDate,
          endDate
        );
        showToast.success(`Đã xuất báo cáo doanh thu: ${result.fileName}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Có lỗi khi xuất báo cáo!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Xuất báo cáo thuế
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Xuất file XML theo định dạng chuẩn Tổng cục Thuế để nhập vào phần mềm
          kê khai thuế
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold mb-1">💡 Hộ kinh doanh dưới 500 triệu/năm:</p>
            <p>Chỉ cần xuất <strong>Sổ doanh thu S1a-HKD</strong> (file Excel) - không cần kê khai VAT.</p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Cấu hình báo cáo
        </h2>

        <div className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Loại báo cáo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* S1a-HKD - Recommended for small businesses */}
              <button
                onClick={() => setReportType("s1a-hkd")}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  reportType === "s1a-hkd"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-200"
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sổ S1a-HKD
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    Đề xuất
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Doanh thu &lt; 500tr/năm (Excel)
                </div>
              </button>

              <button
                onClick={() => setReportType("vat")}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  reportType === "vat"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Tờ khai VAT
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  01/GTGT (XML)
                </div>
              </button>

              <button
                onClick={() => setReportType("revenue")}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  reportType === "revenue"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Báo cáo doanh thu
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Chi tiết theo kỳ (XML)
                </div>
              </button>
            </div>
          </div>

          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Kỳ báo cáo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPeriodType("month")}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  periodType === "month"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold"
                    : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                }`}
              >
                Theo tháng
              </button>
              <button
                onClick={() => setPeriodType("quarter")}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  periodType === "quarter"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-semibold"
                    : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                }`}
              >
                Theo quý
              </button>
            </div>
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Năm
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Month/Quarter Selection */}
          {periodType === "month" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tháng
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    Tháng {month}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Quý
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {[1, 2, 3, 4].map((quarter) => (
                  <option key={quarter} value={quarter}>
                    Quý {quarter}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Preview Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Tổng quan dữ liệu
        </h2>

        {reportType === "s1a-hkd" ? (
          /* === S1a-HKD: Bảng chi tiết thuế tách theo loại doanh thu === */
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Số giao dịch</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{previewStats.transactionCount}</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm text-green-700 dark:text-green-400 mb-1">Tổng doanh thu</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(previewStats.totalRevenue)}</div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Tổng thuế phải nộp</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(previewStats.totalVAT)}</div>
              </div>
            </div>

            {/* Chi tiết thuế theo loại doanh thu */}
            <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-600 dark:text-slate-300">Loại doanh thu</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">Doanh thu</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">GTGT</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">TNCN</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">Tổng thuế</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                      <div className="font-medium">Bán hàng / Phụ tùng</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{(previewStats as any).goodsCount || 0} đơn • 1% + 0.5%</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-900 dark:text-slate-100">{formatCurrency((previewStats as any).goodsRevenue || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600 dark:text-orange-400">{formatCurrency((previewStats as any).goodsGTGT || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{formatCurrency((previewStats as any).goodsTNCN || 0)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency((previewStats as any).goodsTax || 0)}</td>
                  </tr>
                  <tr className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">
                      <div className="font-medium">Dịch vụ sửa chữa</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{(previewStats as any).woServiceCount || 0} phiếu có tiền công • 3% + 1.5%</div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-900 dark:text-slate-100">{formatCurrency((previewStats as any).woServiceRevenue || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600 dark:text-orange-400">{formatCurrency((previewStats as any).serviceGTGT || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-purple-600 dark:text-purple-400">{formatCurrency((previewStats as any).serviceTNCN || 0)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency((previewStats as any).serviceTax || 0)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">Tổng cộng</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{formatCurrency(previewStats.totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(((previewStats as any).goodsGTGT || 0) + ((previewStats as any).serviceGTGT || 0))}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(((previewStats as any).goodsTNCN || 0) + ((previewStats as any).serviceTNCN || 0))}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-orange-600 dark:text-orange-400">{formatCurrency(previewStats.totalVAT)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          /* === VAT / Revenue report: Giữ nguyên layout cũ === */
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Số giao dịch</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{previewStats.transactionCount}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-400 mb-1">Doanh thu chưa VAT</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(previewStats.totalRevenue)}</div>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Thuế VAT</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(previewStats.totalVAT)}</div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Kỳ báo cáo:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {periodType === "month"
                ? `Tháng ${selectedMonth}/${selectedYear}`
                : `Quý ${selectedQuarter}/${selectedYear}`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-600 dark:text-slate-400">Từ ngày:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatDate(getDateRange().startDate)} -{" "}
              {formatDate(getDateRange().endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={previewStats.transactionCount === 0}
        className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          previewStats.transactionCount === 0
            ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
            : reportType === "s1a-hkd"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl"
        }`}
      >
        {reportType === "s1a-hkd" ? (
          <>
            <FileSpreadsheet className="w-5 h-5" />
            Xuất file Excel (S1a-HKD)
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Xuất file XML
          </>
        )}
      </button>

      {previewStats.transactionCount === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
          Không có dữ liệu trong kỳ này
        </p>
      )}
    </div>
  );
};

export default TaxReportExport;
