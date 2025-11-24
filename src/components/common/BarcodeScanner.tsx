import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" }, // Camera sau
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Quét thành công
            onScan(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Bỏ qua lỗi quét (bình thường khi chưa nhìn thấy mã)
            // Không log để tránh spam console
          }
        );
        setIsScanning(true);
        setError("");
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        setError(
          "Không thể truy cập camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt."
        );
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && isScanning) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
      setIsScanning(false);
      onClose();
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(console.error);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Quét mã vạch
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div id="barcode-reader" className="w-full"></div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-xl text-white text-sm max-w-md">
          <p className="font-semibold mb-1">⚠️ Lỗi camera</p>
          <p>{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-center text-white/70 text-sm max-w-md">
        <p>📸 Đưa camera vào mã vạch để quét tự động</p>
        <p className="mt-2">Mã vạch sẽ được thêm vào giỏ hàng ngay lập tức</p>
      </div>
    </div>
  );
};
