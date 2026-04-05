import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: Record<string, string | undefined>;
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

function sendJson(res: any, status: number, payload: Record<string, unknown>) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(payload));
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
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

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();
  const name = String(req.body?.name || "").trim();
  const role = String(req.body?.role || "staff").trim();
  const branchId = String(req.body?.branch_id || "CN1").trim();
  const permissions = req.body?.permissions || {};

  if (!email || !password || password.length < 6) {
    sendJson(res, 400, { error: "Email và mật khẩu hợp lệ là bắt buộc" });
    return;
  }

  if (!["owner", "manager", "staff"].includes(role)) {
    sendJson(res, 400, { error: "Role không hợp lệ" });
    return;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Verify caller identity and owner role.
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

    if (callerProfileError) {
      sendJson(res, 403, { error: "Không thể kiểm tra quyền người thao tác" });
      return;
    }

    if (callerProfile?.role !== "owner") {
      sendJson(res, 403, { error: "Chỉ chủ cửa hàng mới được tạo tài khoản nhân viên" });
      return;
    }

    const { data: existingProfile, error: existingProfileError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      sendJson(res, 500, { error: "Không thể kiểm tra email đã tồn tại" });
      return;
    }

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
      sendJson(res, 500, { error: "Tạo auth user thành công nhưng không thể đồng bộ profile" });
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
}
