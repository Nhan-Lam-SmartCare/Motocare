# ✅ ĐÃ HOÀN THÀNH: Thêm Mã QR Thanh Toán Động

## 🎯 Tính năng đã thêm

Phiếu sửa chữa giờ hiển thị **mã QR thanh toán động** với:
- ✅ Số tiền tự động = Số tiền còn nợ (hoặc tổng tiền nếu chưa thanh toán)
- ✅ Nội dung chuyển khoản tự động = "Thanh toan SC-xxx" (mã phiếu)
- ✅ Hỗ trợ tất cả ngân hàng Việt Nam (VietQR standard)
- ✅ Fallback về QR tĩnh nếu không có thông tin ngân hàng

## 📝 Files đã tạo/sửa

### 1. **src/utils/vietqr.ts** (MỚI)
Utility functions để generate VietQR URL:
- `generateVietQRUrl()` - Tạo URL QR theo chuẩn VietQR
- `findBankBin()` - Tìm mã BIN ngân hàng
- `BANK_BINS` - Danh sách 40+ ngân hàng Việt Nam

### 2. **src/components/service/modals/PrintOrderPreviewModal.tsx**
- Thêm import VietQR utilities
- Logic tự động tạo QR code với số tiền và nội dung
- Hiển thị "Quét mã thanh toán" dưới QR

### 3. **src/components/service/ServiceManager.tsx**
- Thêm import VietQR utilities  
- Thêm `useMemo` để generate QR động khi in phiếu
- Cập nhật template in phiếu với QR động

## 🚀 Cách hoạt động

### Input (từ Settings):
```typescript
bank_name: "Vietcombank"  // Hoặc tên bất kỳ
bank_account_number: "1234567890"
bank_account_holder: "NGUYEN VAN A"
```

### Process:
1. Tìm mã BIN ngân hàng: `"Vietcombank"` → `"970436"`
2. Lấy số tiền: `remainingAmount` hoặc `total`
3. Tạo nội dung: `"Thanh toan SC-20260128-894980"`
4. Generate URL VietQR

### Output:
```
https://img.vietqr.io/image/970436-1234567890-qr_only.png?amount=960000&addInfo=Thanh%20toan%20SC-20260128-894980&accountName=NGUYEN%20VAN%20A
```

## 📱 Khi quét QR:

Khách hàng mở app banking → Quét mã → Tự động điền:
- ✅ **Số tiền**: 960.000đ (chính xác)
- ✅ **Nội dung CK**: "Thanh toan SC-20260128-894980"
- ✅ **Ngân hàng & STK**: Tự động

## 🏦 Danh sách ngân hàng hỗ trợ

- Vietcombank, Vietinbank, BIDV, Agribank
- Techcombank, MBBank, VPBank, ACB, Sacombank
- HDBank, SHB, TPBank, VIB, MSB, OCB, SeABank
- NCB, KienLongBank, LienVietPostBank, BacABank
- PVcomBank, VietCapitalBank, SCB
- CAKE, Ubank, Timo, ViettelMoney, VNPTMoney
- **Và 20+ ngân hàng khác**

## ⚙️ Cấu hình

### Bước 1: Vào Settings
Điền đầy đủ thông tin:
- ✅ **Tên ngân hàng**: VD: "Vietcombank" hoặc "VCB"
- ✅ **Số tài khoản**: VD: "1234567890"
- ✅ **Chủ tài khoản**: VD: "NGUYEN VAN A"

### Bước 2: In phiếu
- QR code sẽ tự động hiển thị với số tiền đúng
- Nếu thiếu thông tin → Dùng QR tĩnh cũ (bank_qr_url)

## 🧪 Test

1. ✅ Tạo phiếu mới với tổng tiền 500.000đ
2. ✅ In phiếu → Quét QR → Kiểm tra số tiền = 500.000đ
3. ✅ Đặt cọc 200.000đ → In phiếu → Quét QR → Số tiền = 300.000đ (còn nợ)
4. ✅ Thanh toán đủ → In phiếu → Quét QR → Số tiền = 500.000đ (tổng)

## 🔄 Fallback Logic

```typescript
QR nguồn = (
  Có đủ thông tin ngân hàng? 
    → Generate QR động 
    : Dùng bank_qr_url tĩnh
)
```

## 📸 Ví dụ QR Code

### Trước (QR tĩnh):
- Luôn là 1 QR cố định
- Không có số tiền
- Khách phải tự nhập số tiền

### Sau (QR động):
- Mỗi phiếu 1 QR riêng
- Có sẵn số tiền chính xác
- Có nội dung chuyển khoản
- Quét là chuyển luôn!

## 💡 Lợi ích

1. **Tiện lợi**: Khách hàng quét là chuyển, không cần nhập gì
2. **Chính xác**: Không lo nhầm số tiền
3. **Đối soát dễ**: Nội dung CK có mã phiếu
4. **Tự động**: Không cần cập nhật QR thủ công

## ⚠️ Lưu ý

- QR chỉ hoạt động khi có **đủ 3 thông tin**: Tên bank, STK, Chủ TK
- Nếu thiếu → Tự động dùng QR tĩnh (bank_qr_url)
- Nếu không tìm thấy mã BIN → Dùng QR tĩnh
- VietQR free tier: Không giới hạn số lượng QR

## 🔗 Links tham khảo

- VietQR API: https://www.vietqr.io/
- Danh sách Bank BINs: https://api.vietqr.io/v2/banks
