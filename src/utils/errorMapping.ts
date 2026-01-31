import { RepoErrorDetail } from "../lib/repository/types";

// User-facing message mapping based on code
export function mapRepoErrorForUser(err: RepoErrorDetail): string {
  switch (err.code) {
    case "network":
      return "Mất kết nối máy chủ. Vui lòng kiểm tra mạng.";
    case "validation":
      return err.message;
    case "not_found":
      return "Không tìm thấy bản ghi.";
    case "supabase":
      // 🔹 FIX: Hiển thị message chi tiết thay vì generic message
      return err.message || "Có lỗi dữ liệu. Thử lại hoặc liên hệ quản trị.";
    default:
      return err.message || "Lỗi không xác định.";
  }
}
