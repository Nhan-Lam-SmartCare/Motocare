# Quy ước danh mục kho Motocare

Mục tiêu: dùng `category` để phân loại theo công năng, không dùng để lưu hãng.
Hãng như Honda, Yamaha, IRC, Kenda, Casumina nên nằm trong tên hàng hoặc một trường riêng nếu sau này nâng cấp dữ liệu.

## Cây danh mục đề xuất

1. Lốp - Săm - Ruột
2. Dầu nhớt - Dung dịch
3. Điện - Đèn - Còi
4. Phanh - Thắng
5. Truyền động - Nồi - Dây curoa
6. Lọc gió - Lọc nhớt - Lọc xăng
7. Động cơ - Ron - Phớt - Bạc đạn
8. Nhiên liệu - Bình xăng - Bơm xăng
9. Tay lái - Gương - Khóa - Dây điều khiển
10. Nhựa - Dàn áo - Tem
11. Khung sườn - Phuộc - Chân chống
12. Ốc vít - Cao su - Vật tư nhỏ
13. Xe điện
14. Khác - Cần rà soát

## Nguyên tắc nhập hàng mới

- Chọn danh mục theo bộ phận/công năng chính của món hàng.
- Không dùng danh mục để ghi hãng hoặc nguồn hàng.
- Tên hàng nên giữ đủ 4 phần khi có thể: loại hàng, vị trí/xe dùng, thông số, hãng.
- Ví dụ tốt: `Lốp sau không săm 90/90-14 IRC`, `Dây curoa AB125/SH Mode Bando`, `Bố thắng sau Wave`.
- Dùng `Khác - Cần rà soát` tạm thời nếu chưa chắc, rồi gom lại định kỳ.

## File gợi ý tự động

Script `scripts/maintenance/suggest-part-categories.mjs` đọc kho hiện tại và xuất:

- `exports/part_category_suggestions.csv`
- `exports/part_category_suggestions.json`

CSV có cột `currentCategory`, `suggestedCategory`, `confidence`, `changed` để duyệt trước khi cập nhật dữ liệu thật.
