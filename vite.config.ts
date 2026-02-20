import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: { port: 4310, host: "0.0.0.0" },
    plugins: [react()],
    test: {
      exclude: ["e2e/**", "node_modules/**"],
    },
    resolve: {
      alias: { "@": path.resolve(process.cwd(), "src") },
      dedupe: ["react", "react-dom"],
    },
    build: {
      chunkSizeWarningLimit: 1200,
      // Cache-busting: thêm hash vào tên file để trình duyệt luôn tải bản mới nhất
      rollupOptions: {
        input: path.resolve(process.cwd(), "index.html"),
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            // React Router must be in its own chunk so React fully initialises first
            if (id.includes("react-router-dom") || id.includes("react-router") || id.includes("@remix-run")) {
              return "vendor-router";
            }

            // Core React runtime – scheduler is an internal React dep
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/") ||
              id.includes("/node_modules/use-sync-external-store/")
            ) {
              return "vendor-react";
            }

            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }

            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }

            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }

            if (id.includes("react-toastify")) {
              return "vendor-toast";
            }

            if (id.includes("html5-qrcode")) {
              return "vendor-qr";
            }

            if (id.includes("recharts")) {
              return "vendor-charts";
            }

            if (id.includes("xlsx")) {
              return "vendor-xlsx";
            }

            if (id.includes("jspdf") || id.includes("jspdf-autotable")) {
              return "vendor-pdf";
            }

            if (id.includes("html2canvas")) {
              return "vendor-canvas";
            }

            return "vendor";
          },
          // Thêm content hash vào tên file - khi code thay đổi, hash thay đổi
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
    // Note: API keys should be handled server-side, not exposed in client bundle
    // If Gemini API is needed, create a backend proxy endpoint
    define: {},
  };
});
