import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ===================================================================
// MOTOCARE — RPC CONTRACT TEST (V1 ↔ V2)
// ===================================================================
// The V1 UI runs unchanged against V2, so every RPC must keep the exact
// same name and parameter names. This script fetches the OpenAPI spec
// PostgREST auto-generates for each project and diffs the /rpc/* paths:
//   • RPCs present in V1 but missing in V2  → FAIL (UI call will 404)
//   • Parameter names that differ           → FAIL (PGRST202 at runtime)
//   • RPCs only in V2                       → info (new, harmless)
//
// No SQL deployment needed — reads the public spec with the service key.
// Usage: node scripts/maintenance/contract_test_rpc.mjs
// ===================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const v1Url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const v1Key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const v2Url = process.env.SUPABASE_URL_V2;
const v2Key = process.env.SUPABASE_SERVICE_ROLE_KEY_V2;

if (!v1Url || !v1Key || !v2Url || !v2Key) {
  console.error("❌ Missing V1/V2 credentials in .env (see docs/staging_migration_guide.md Bước 4)");
  process.exit(1);
}

// RPCs the V1 frontend actually calls — the contract that MUST hold.
// Grep source: `grep -rn "\.rpc(" src/` — update when the UI adds calls.
const CRITICAL_RPCS = [
  "sale_create_atomic",
  "sale_update_atomic",
  "sale_delete_atomic",
  "work_order_create_atomic",
  "work_order_update_atomic",
  "work_order_refund_atomic",
  "work_order_complete_payment",
  "receipt_create_atomic",
  "adjust_part_stock",
  "stock_ensure_update",
  "get_public_work_order",
  "get_external_part_categories",
  "mc_current_branch",
];

async function fetchSpec(url, key) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`OpenAPI fetch ${url}: HTTP ${res.status}`);
  return res.json();
}

// Extract { rpcName: Set(paramNames) } from a PostgREST OpenAPI spec.
function extractRpcs(spec) {
  const out = new Map();
  for (const [p, def] of Object.entries(spec.paths || {})) {
    if (!p.startsWith("/rpc/")) continue;
    const name = p.slice("/rpc/".length);
    const post = def.post || {};
    const params = new Set();
    // PostgREST lists args either as a body schema $ref or inline parameters.
    const bodyParam = (post.parameters || []).find((x) => x.in === "body");
    const ref = bodyParam?.schema?.$ref; // e.g. "#/definitions/(rpc) sale_create_atomic"
    if (ref) {
      const defKey = decodeURIComponent(ref.replace("#/definitions/", ""));
      const props = spec.definitions?.[defKey]?.properties || {};
      for (const k of Object.keys(props)) params.add(k);
    } else {
      for (const prm of post.parameters || []) {
        if (prm.in === "query" || prm.in === "formData") params.add(prm.name);
      }
    }
    out.set(name, params);
  }
  return out;
}

function diffSets(a, b) {
  return [...a].filter((x) => !b.has(x));
}

async function run() {
  console.log("🔍 Đang tải OpenAPI spec từ hai project...\n");
  const [specV1, specV2] = await Promise.all([
    fetchSpec(v1Url, v1Key),
    fetchSpec(v2Url, v2Key),
  ]);

  const rpcV1 = extractRpcs(specV1);
  const rpcV2 = extractRpcs(specV2);

  console.log(`V1: ${rpcV1.size} RPC | V2: ${rpcV2.size} RPC\n`);
  console.log("=".repeat(72));
  console.log("KIỂM TRA HỢP ĐỒNG RPC (các RPC frontend đang gọi)");
  console.log("=".repeat(72));

  let failures = 0;

  for (const name of CRITICAL_RPCS) {
    const inV1 = rpcV1.has(name);
    const inV2 = rpcV2.has(name);

    if (!inV1 && !inV2) {
      console.log(`⚪ ${name} — không có ở cả hai (kiểm tra lại tên trong CRITICAL_RPCS)`);
      continue;
    }
    if (inV1 && !inV2) {
      console.log(`❌ ${name} — CÓ ở V1, THIẾU ở V2 → UI sẽ lỗi 404`);
      failures++;
      continue;
    }
    if (!inV1 && inV2) {
      console.log(`✅ ${name} — chỉ có ở V2 (RPC mới, V1 chưa từng có)`);
      continue;
    }

    const p1 = rpcV1.get(name);
    const p2 = rpcV2.get(name);
    const missingInV2 = diffSets(p1, p2);
    const extraInV2 = diffSets(p2, p1);

    if (missingInV2.length === 0 && extraInV2.length === 0) {
      console.log(`✅ ${name} — chữ ký khớp (${p1.size} tham số)`);
    } else {
      failures++;
      console.log(`❌ ${name} — LỆCH CHỮ KÝ:`);
      if (missingInV2.length)
        console.log(`     V2 thiếu tham số: ${missingInV2.join(", ")} → PGRST202 khi UI gọi`);
      if (extraInV2.length)
        console.log(`     V2 thừa tham số: ${extraInV2.join(", ")} (lỗi nếu không có DEFAULT)`);
    }
  }

  // Informational: full-catalog diff beyond the critical list.
  const onlyV1 = [...rpcV1.keys()].filter((n) => !rpcV2.has(n) && !CRITICAL_RPCS.includes(n));
  if (onlyV1.length) {
    console.log("\nℹ️  RPC khác có ở V1 nhưng chưa có ở V2 (rà xem UI có gọi không):");
    for (const n of onlyV1) console.log(`   • ${n}`);
  }

  console.log("\n" + "=".repeat(72));
  if (failures === 0) {
    console.log("✅ HỢP ĐỒNG RPC KHỚP — UI V1 chạy được trên V2.");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} RPC lệch hợp đồng — sửa trước khi Parallel Run.`);
    process.exit(2);
  }
}

run().catch((e) => {
  console.error("💥 Lỗi khi chạy contract test:", e.message);
  process.exit(1);
});
