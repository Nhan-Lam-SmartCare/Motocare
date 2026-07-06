import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const old = JSON.parse(fs.readFileSync(join(__dirname, "_parts_dump_0530.json"), "utf8"));
const oldById = new Map(old.map(p => [p.id, p]));

const { data: cur, error } = await supabase.from("parts").select("id, name, sku, category").in("category", ["Honda", "Yamaha"]);
if (error) { console.error(error); process.exit(1); }

console.log("Current Honda/Yamaha parts:", cur.length);
let willRestore = 0, alreadyOk = 0, noOldRecord = 0, oldSkuEmpty = 0;
const missing = [];
for (const p of cur) {
  const o = oldById.get(p.id);
  if (!o) { noOldRecord++; missing.push(p); continue; }
  const oldSku = (o.sku || "").trim();
  if (!oldSku) { oldSkuEmpty++; continue; }
  if (oldSku === p.sku) { alreadyOk++; continue; }
  willRestore++;
}
console.log("→ will restore (old sku found & differs):", willRestore);
console.log("→ already correct:", alreadyOk);
console.log("→ old record has empty sku:", oldSkuEmpty);
console.log("→ NO old record (added after 05-30):", noOldRecord);
console.log("\n--- parts with NO old record (cannot restore) ---");
missing.forEach(p => console.log(`[${p.category}] sku=${p.sku} | ${p.name} | ${p.id}`));
