import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Reads each project's PostgREST OpenAPI spec (lists exposed RPC paths without
// executing anything) and reports whether the temporary auth-migration RPCs
// are still present. Per Ke hoach.md mục 4.1 they MUST be dropped after use.
const TARGETS = [
  ["V1", process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY],
  ["V2", process.env.SUPABASE_URL_V2, process.env.SUPABASE_SERVICE_ROLE_KEY_V2],
];
const SENSITIVE = ["temp_export_users", "temp_import_users"];

let anyFound = false;
for (const [label, url, key] of TARGETS) {
  if (!url || !key) {
    console.log(`${label}: ⚠️ thiếu credentials trong .env`);
    continue;
  }
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.log(`${label}: ⚠️ không đọc được OpenAPI spec (HTTP ${res.status})`);
    anyFound = true; // treat as unverified
    continue;
  }
  const spec = await res.json();
  const rpcs = Object.keys(spec.paths || {})
    .filter(p => p.startsWith("/rpc/"))
    .map(p => p.slice("/rpc/".length));
  for (const fn of SENSITIVE) {
    const present = rpcs.includes(fn);
    if (present) anyFound = true;
    console.log(`${label}: ${fn} → ${present ? "🔴 VẪN TỒN TẠI — phải DROP ngay" : "✅ đã DROP (không còn trong schema public)"}`);
  }
}

process.exit(anyFound ? 1 : 0);
