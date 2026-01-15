import React from "react";
import { ScanLine, Camera, X } from "lucide-react";

interface BarcodeInputBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCameraClick: () => void;
    onClose?: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    showCloseButton?: boolean;
}

/**
 * Barcode input bar component for keyboard barcode entry
 */
export const BarcodeInputBar: React.FC<BarcodeInputBarProps> = ({
    value,
    onChange,
    onSubmit,
    onCameraClick,
    onClose,
    inputRef,
    showCloseButton = false,
}) => {
    return (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 px-4 py-3 shadow-lg">
            <form onSubmit={onSubmit} className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-white flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Quét hoặc nhập mã vạch..."
                    className="flex-1 px-3 py-2 bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-lg focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                    type="button"
                    onClick={onCameraClick}
                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                    title="Quét bằng camera"
                >
                    <Camera className="w-5 h-5" />
                </button>
                {showCloseButton && onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        title="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </form>
            <p className="text-xs text-white/80 mt-2">
                Nhấn Enter sau khi nhập mã hoặc dùng camera để quét
            </p>
        </div>
    );
};
