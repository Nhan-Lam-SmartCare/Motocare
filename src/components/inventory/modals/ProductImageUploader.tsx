import React, { useState, useRef, useCallback } from "react";
import { supabase } from "../../../supabaseClient";
import { showToast } from "../../../utils/toast";

interface ProductImageUploaderProps {
  /** Current image URL (existing or newly uploaded) */
  imageUrl: string;
  /** Called when the image URL changes (after upload or removal) */
  onImageChange: (url: string) => void;
  /** Alt text for the image preview */
  altText?: string;
  /** Show compact layout */
  compact?: boolean;
}

/**
 * Utility to compress image on client-side before uploading.
 * Resizes image to a max width/height of 800px and compresses quality to 75%.
 * Reduces typical smartphone camera uploads from 4MB down to ~60-100KB (98% reduction!).
 */
const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<File> => {
  return new Promise((resolve) => {
    // If not a JPEG/PNG/WebP, skip compression
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  imageUrl,
  onImageChange,
  altText = "Ảnh sản phẩm",
  compact = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(imageUrl || "");
  const [dragOver, setDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Update preview when imageUrl prop changes
  React.useEffect(() => {
    if (imageUrl && !preview) {
      setPreview(imageUrl);
    }
  }, [imageUrl]);

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast.warning("Chỉ chấp nhận file hình ảnh");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast.warning("Kích thước ảnh tối đa 5MB");
        return;
      }

      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      setUploading(true);
      try {
        const compressedFile = await compressImage(file);
        console.warn(`[Image Compression] Original: ${(file.size / 1024).toFixed(1)}KB -> Compressed: ${(compressedFile.size / 1024).toFixed(1)}KB (Saved ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% space)`);
        const publicUrl = await uploadToSupabase(compressedFile);
        onImageChange(publicUrl);
        showToast.success("Tải ảnh lên thành công!");
      } catch (err: any) {
        console.error("Upload error:", err);
        showToast.error("Lỗi tải ảnh: " + (err?.message || "Vui lòng thử lại"));
        setPreview(imageUrl || "");
      } finally {
        setUploading(false);
      }
    },
    [imageUrl, onImageChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so re-selecting the same file triggers onChange
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // Bind camera stream when video element mounts in the DOM
  React.useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Failed to auto-play camera video stream:", err);
      });
    }
  }, [showCamera]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      showToast.error("Không thể truy cập camera. Vui lòng cấp quyền camera.");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        await handleFile(file);
      },
      "image/jpeg",
      0.85
    );
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const removeImage = () => {
    setPreview("");
    onImageChange("");
  };

  const previewSize = compact ? "h-16 w-16" : "h-20 w-20";
  const borderRadius = compact ? "rounded-xl" : "rounded-lg";

  return (
    <div className="space-y-2">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Chụp ảnh sản phẩm
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[60vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Chụp
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main upload area - Centered vertical layout for mobile & desktop */}
      <div className="flex flex-col items-center justify-center gap-4 py-2">
        {/* Preview / Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            h-28 w-28 shrink-0 rounded-2xl border-2 flex flex-col items-center justify-center relative shadow-sm overflow-hidden select-none transition-all duration-300 cursor-pointer
            ${preview ? "border-slate-200 dark:border-slate-700 bg-white hover:scale-[1.02]" : "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 hover:border-blue-400 dark:hover:border-blue-500"}
            ${dragOver ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : ""}
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
          title={preview ? "Click để thay đổi ảnh" : "Click để chọn ảnh"}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt={altText}
                className="w-full h-full object-contain p-2 mix-blend-multiply"
              />
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <svg className="w-7 h-7 text-slate-400 dark:text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Chưa có ảnh
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Action buttons row below preview */}
        <div className="flex gap-2 w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Tải ảnh
          </button>
          <button
            type="button"
            onClick={startCamera}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            Chụp ảnh
          </button>
          {preview && !uploading && (
            <button
              type="button"
              onClick={removeImage}
              className="w-9 h-9 shrink-0 flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
              title="Xóa ảnh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {uploading && (
          <div className="w-full max-w-[280px] h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageUploader;
