import * as XLSX from "xlsx";
import type { Part } from "../types";

/**
 * Export parts to Excel file
 */
export const exportPartsToExcel = (
  parts: Part[],
  currentBranchId: string,
  filename: string = "inventory-export.xlsx"
) => {
  // Prepare data for export
  const data = parts.map((part, index) => ({
    STT: index + 1,
    "Tên sản phẩm": part.name,
    SKU: part.sku,
    "Danh mục": part.category || "",
    "Tồn kho": part.stock[currentBranchId] || 0,
    "Giá bán lẻ": part.retailPrice[currentBranchId] || 0,
    "Giá bán sỉ": part.wholesalePrice?.[currentBranchId] || 0,
    "Giá trị tồn":
      (part.stock[currentBranchId] || 0) *
      (part.retailPrice[currentBranchId] || 0),
    "Mô tả": part.description || "",
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 5 }, // STT
    { wch: 30 }, // Tên sản phẩm
    { wch: 15 }, // SKU
    { wch: 20 }, // Danh mục
    { wch: 10 }, // Tồn kho
    { wch: 15 }, // Giá bán lẻ
    { wch: 15 }, // Giá bán sỉ
    { wch: 15 }, // Giá trị tồn
    { wch: 40 }, // Mô tả
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tồn kho");

  // Save file
  XLSX.writeFile(wb, filename);
};

/**
 * Export inventory template for import
 */
export const exportInventoryTemplate = (
  filename: string = "inventory-template.xlsx"
) => {
  const templateData = [
    {
      "Tên sản phẩm": "VD: Nhớt Motul 7100 10W40",
      SKU: "MOTUL-7100",
      "Danh mục": "Nhớt động cơ",
      "Số lượng nhập": 50,
      "Giá bán lẻ": 180000,
      "Giá bán sỉ": 150000,
      "Mô tả": "Nhớt cao cấp cho xe côn tay",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws["!cols"] = [
    { wch: 30 }, // Tên sản phẩm
    { wch: 15 }, // SKU
    { wch: 20 }, // Danh mục
    { wch: 15 }, // Số lượng nhập
    { wch: 15 }, // Giá bán lẻ
    { wch: 15 }, // Giá bán sỉ
    { wch: 40 }, // Mô tả
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  XLSX.writeFile(wb, filename);
};

/**
 * Import parts from Excel/CSV file
 */
export const importPartsFromExcel = (
  file: File,
  currentBranchId: string
): Promise<
  Array<{
    name: string;
    sku: string;
    category?: string;
    quantity: number;
    retailPrice: number;
    wholesalePrice: number;
    description?: string;
  }>
> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Parse and validate data
        const parts = jsonData.map((row: any) => {
          // Support multiple column name formats
          const name =
            row["Tên sản phẩm"] || row["Ten san pham"] || row["name"] || "";
          const sku = row["SKU"] || row["sku"] || "";
          const category =
            row["Danh mục"] || row["Danh muc"] || row["category"] || undefined;
          const quantity =
            parseInt(
              row["Số lượng nhập"] ||
                row["So luong nhap"] ||
                row["quantity"] ||
                "0"
            ) || 0;
          const retailPrice =
            parseFloat(
              row["Giá bán lẻ"] ||
                row["Gia ban le"] ||
                row["retailPrice"] ||
                "0"
            ) || 0;
          const wholesalePrice =
            parseFloat(
              row["Giá bán sỉ"] ||
                row["Gia ban si"] ||
                row["wholesalePrice"] ||
                "0"
            ) || 0;
          const description =
            row["Mô tả"] || row["Mo ta"] || row["description"] || undefined;

          if (!name || !sku) {
            throw new Error(
              `Dòng thiếu thông tin bắt buộc: Tên sản phẩm hoặc SKU`
            );
          }

          return {
            name,
            sku,
            category,
            quantity,
            retailPrice,
            wholesalePrice,
            description,
          };
        });

        resolve(parts);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Lỗi đọc file"));
    };

    reader.readAsBinaryString(file);
  });
};
