import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ===================================================================
// MOTOCARE — COPY STORAGE BUCKET images V1 → V2
// ===================================================================
// Per docs/infrastructure_checklist_v2.md mục 1. Idempotent: files that
// already exist on V2 with the same size are skipped, so re-running only
// copies what's missing (safe to run again right before Golive to catch
// images uploaded to V1 in between).
//
// Usage: node scripts/maintenance/copy_storage_v1_to_v2.mjs [--dry-run]
// ===================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKET = "images";

const v1 = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const v2 = createClient(
  process.env.SUPABASE_URL_V2,
  process.env.SUPABASE_SERVICE_ROLE_KEY_V2,
  { auth: { persistSession: false } }
);

// Recursively list every file in a bucket (folders come back as entries
// with id=null and must be descended into).
async function listAll(client, prefix = "") {
  const files = [];
  let page = 0;
  const size = 100;
  for (;;) {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, {
      limit: size,
      offset: page * size,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${BUCKET}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listAll(client, fullPath)));
      } else {
        files.push({ path: fullPath, size: entry.metadata?.size ?? null, mimetype: entry.metadata?.mimetype });
      }
    }
    if (data.length < size) break;
    page++;
  }
  return files;
}

async function ensureBucket() {
  const { data: buckets, error } = await v2.storage.listBuckets();
  if (error) throw new Error(`listBuckets V2: ${error.message}`);
  if (!buckets.some((b) => b.name === BUCKET)) {
    if (DRY_RUN) {
      console.log(`[dry-run] Bucket '${BUCKET}' chưa có trên V2 — sẽ tạo (public)`);
      return;
    }
    const { error: createErr } = await v2.storage.createBucket(BUCKET, { public: true });
    if (createErr) throw new Error(`createBucket V2: ${createErr.message}`);
    console.log(`✅ Đã tạo bucket '${BUCKET}' (public) trên V2`);
  }
}

async function run() {
  console.log(`📦 Copy Storage bucket '${BUCKET}' V1 → V2${DRY_RUN ? " (DRY RUN)" : ""}...\n`);

  await ensureBucket();

  const [v1Files, v2Files] = await Promise.all([listAll(v1), listAll(v2)]);
  const v2Map = new Map(v2Files.map((f) => [f.path, f]));

  const toCopy = v1Files.filter((f) => {
    const existing = v2Map.get(f.path);
    if (!existing) return true;
    // Same path + same size → assume identical, skip.
    return f.size !== null && existing.size !== null && f.size !== existing.size;
  });

  console.log(`V1: ${v1Files.length} file | V2 hiện có: ${v2Files.length} file | cần copy: ${toCopy.length}\n`);

  if (DRY_RUN) {
    for (const f of toCopy) console.log(`  [dry-run] ${f.path} (${f.size ?? "?"} bytes)`);
    console.log("\nℹ️ Dry run — chưa copy gì. Chạy lại không kèm --dry-run để copy thật.");
    return;
  }

  let ok = 0, failed = 0;
  for (const f of toCopy) {
    try {
      const { data: blob, error: dlErr } = await v1.storage.from(BUCKET).download(f.path);
      if (dlErr) throw new Error(`download: ${dlErr.message}`);
      const { error: upErr } = await v2.storage.from(BUCKET).upload(f.path, blob, {
        contentType: f.mimetype || "application/octet-stream",
        upsert: true,
      });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      ok++;
      if (ok % 20 === 0) console.log(`  ...${ok}/${toCopy.length}`);
    } catch (e) {
      failed++;
      console.error(`  ❌ ${f.path}: ${e.message}`);
    }
  }

  console.log(`\n${failed === 0 ? "✅" : "⚠️"} Copy xong: ${ok} thành công, ${failed} lỗi.`);
  if (failed === 0 && toCopy.length > 0) {
    console.log("→ Bước tiếp theo: chạy 4 câu UPDATE rewrite URL trong docs/infrastructure_checklist_v2.md mục 1.");
  }
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error("💥 Lỗi:", e.message);
  process.exit(1);
});
