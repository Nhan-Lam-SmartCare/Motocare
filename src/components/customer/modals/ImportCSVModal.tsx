import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { useCreateCustomersBulk } from "../../../hooks/useSupabase";
import { useCreateSuppliersBulk } from "../../../hooks/useSuppliers";
import { XMarkIcon } from "../../Icons";

interface ImportCSVModalProps {
  onClose: () => void;
  type: "customers" | "suppliers";
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ onClose, type }) => {
  const createCustomersBulk = useCreateCustomersBulk();
  const createSuppliersBulk = useCreateSuppliersBulk();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<
    Array<{ name: string; phone?: string }>
  >([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data;
        if (rows.length === 0) {
          setError("File CSV trống.");
          return;
        }

        const firstRow = rows[0].map((c) => c.toLowerCase().trim());
        const hasHeader = firstRow.some((c) =>
          ["name", "phone", "tên", "sđt", "sdt", "điện thoại"].includes(c)
        );
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const parsed = dataRows
          .map((cols) => ({
            name: (cols[0] || "").trim(),
            phone: (cols[1] || "").trim() || undefined,
          }))
          .filter((row) => row.name);

        if (parsed.length === 0) {
          setError("Không tìm thấy dữ liệu hợp lệ trong CSV.");
          return;
        }
        setPreview(parsed);
      },
      error: (err) => {
        setError(err.message || "Không thể đọc file CSV.");
      },
    });
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    try {
      if (type === "customers") {
        // Import Khách hàng
        const newCustomers = preview.map((p) => ({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `CUS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: p.name,
          phone: p.phone || "",
          created_at: new Date().toISOString(),
        }));
        await createCustomersBulk.mutateAsync(newCustomers);
        alert(`Đã import thành công ${newCustomers.length} khách hàng!`);
      } else {
        const newSuppliers = preview.map((p) => ({
          name: p.name,
          phone: p.phone || "",
        }));
        await createSuppliersBulk.mutateAsync(newSuppliers);
      }

      onClose();
    } catch (err) {
      console.error("Import error:", err);
      setError("Có lỗi xảy ra khi import. Vui lòng thử lại.");
    } finally {
      setImporting(false);
    }
  };

  const isCustomer = type === "customers";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Import {isCustomer ? "khách hàng" : "nhà cung cấp"} từ CSV
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Chọn file CSV với cột đầu tiên là{" "}
            <strong>tên {isCustomer ? "khách hàng" : "nhà cung cấp"}</strong>,
            cột thứ hai là <strong>số điện thoại</strong> (tùy chọn).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {error && <div className="text-red-600 text-xs">{error}</div>}
          {preview.length > 0 && (
            <div className="border rounded p-3 bg-slate-50 dark:bg-slate-900 max-h-64 overflow-y-auto custom-scrollbar">
              <div className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
                Xem trước ({preview.length} mục):
              </div>
              <table className="w-full text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="text-left border-b dark:border-slate-700">
                    <th className="p-1">Tên</th>
                    <th className="p-1">SĐT</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((p, i) => (
                    <tr key={i} className="border-b dark:border-slate-700">
                      <td className="p-1">{p.name}</td>
                      <td className="p-1">{p.phone || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-300"
            >
              Huỷ
            </button>
            <button
              disabled={preview.length === 0 || importing}
              onClick={handleImport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing
                ? "Đang import..."
                : `Import ${preview.length > 0 ? `(${preview.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
