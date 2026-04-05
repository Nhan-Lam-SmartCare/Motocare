import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const readJsonBody = async (req: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (res: any, status: number, payload: Record<string, unknown>) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const createStaffApiPlugin = (env: Record<string, string>) => ({
  name: "motocare-staff-create-api",
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.method !== "POST" || req.url !== "/api/staff-create") {
        next();
        return;
      }

      const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
      const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !serviceRoleKey || !anonKey) {
        sendJson(res, 500, {
          error:
            "Server chưa cấu hình SUPABASE_URL, SUPABASE_ANON_KEY hoặc SUPABASE_SERVICE_ROLE_KEY",
        });
        return;
      }

      const authHeader = String(req.headers?.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!token) {
        sendJson(res, 401, { error: "Thiếu token xác thực" });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const email = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "").trim();
        const name = String(body?.name || "").trim();
        const role = String(body?.role || "staff").trim();
        const branchId = String(body?.branch_id || "CN1").trim();
        const permissions = body?.permissions || {};

        if (!email || !password || password.length < 6) {
          sendJson(res, 400, { error: "Email và mật khẩu hợp lệ là bắt buộc" });
          return;
        }

        if (!["owner", "manager", "staff"].includes(role)) {
          sendJson(res, 400, { error: "Role không hợp lệ" });
          return;
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: authUserData, error: authUserError } = await admin.auth.getUser(token);
        if (authUserError || !authUserData?.user) {
          sendJson(res, 401, { error: "Token không hợp lệ hoặc đã hết hạn" });
          return;
        }

        const callerId = authUserData.user.id;
        const { data: callerProfile, error: callerProfileError } = await admin
          .from("profiles")
          .select("role")
          .eq("id", callerId)
          .maybeSingle();

        if (callerProfileError || callerProfile?.role !== "owner") {
          sendJson(res, 403, { error: "Chỉ chủ cửa hàng mới được tạo tài khoản nhân viên" });
          return;
        }

        const { data: existingProfile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingProfile?.id) {
          sendJson(res, 409, { error: "Email này đã tồn tại trong hệ thống" });
          return;
        }

        const { data: createData, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: name || email.split("@")[0],
            role,
            branch_id: branchId,
          },
        });

        if (createError || !createData?.user?.id) {
          sendJson(res, 400, { error: createError?.message || "Không thể tạo tài khoản" });
          return;
        }

        const userId = createData.user.id;
        const displayName = name || email.split("@")[0];

        const { error: upsertProfileError } = await admin.from("profiles").upsert(
          {
            id: userId,
            email,
            name: displayName,
            role,
            branch_id: branchId,
          },
          { onConflict: "id" }
        );

        if (upsertProfileError) {
          sendJson(res, 500, {
            error: "Tạo auth user thành công nhưng không thể đồng bộ profile",
          });
          return;
        }

        if (permissions && typeof permissions === "object" && Object.keys(permissions).length > 0) {
          await admin.from("staff_permissions").upsert(
            {
              user_id: userId,
              permissions,
              updated_by: callerId,
            },
            { onConflict: "user_id" }
          );
        }

        sendJson(res, 200, { userId });
      } catch (error: any) {
        sendJson(res, 500, { error: error?.message || "Lỗi máy chủ khi tạo tài khoản" });
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: { port: 4310, host: "0.0.0.0" },
    plugins: [react(), createStaffApiPlugin(env)],
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

            // ALL React-ecosystem packages (react, react-dom, react-redux, react-is,
            // scheduler, use-sync-external-store, etc.) must live together so their
            // module-init code never runs before React exports are populated.
            if (
              id.includes("/node_modules/react") ||
              id.includes("/node_modules/scheduler/") ||
              id.includes("/node_modules/use-sync-external-store/") ||
              id.includes("/node_modules/@reduxjs/") ||
              id.includes("/node_modules/react-is/") ||
              id.includes("/node_modules/prop-types/")
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
