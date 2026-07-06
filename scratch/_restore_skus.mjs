import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const APPLY = process.argv.includes("--apply");
const old = JSON.parse(fs.readFileSync(join(__dirname, "_parts_dump_0530.json"), "utf8"));
const oldById = new Map(old.map(p => [p.id, p]));

// current Honda/Yamaha parts
const { data: cur, error } = await supabase.from("parts").select("id, name, sku, category").in("category", ["Honda", "Yamaha"]);
if (error) { console.error(error); process.exit(1); }

// all current SKUs (to detect collisions outside the restore set)
const { data: allParts, error: e2 } = await supabase.from("parts").select("id, sku");
if (e2) { console.error(e2); process.exit(1); }

const restores = [];
for (const p of cur) {
  const o = oldById.get(p.id);
  if (!o) continue;
  const oldSku = (o.sku || "").trim();
  if (!oldSku || oldSku === p.sku) continue;
  restores.push({ id: p.id, name: p.name, category: p.category, from: p.sku, to: oldSku });
}

// collision checks
const targetIds = new Set(restores.map(r => r.id));
const externalSkus = new Map(); // sku -> id, for parts NOT being restored
allParts.forEach(p => { if (!targetIds.has(p.id) && p.sku) externalSkus.set(p.sku, p.id); });

const seen = new Map();
const collisions = [];
for (const r of restores) {
  if (externalSkus.has(r.to)) collisions.push({ ...r, conflictWith: "external part " + externalSkus.get(r.to) });
  if (seen.has(r.to)) collisions.push({ ...r, conflictWith: "another restore (" + seen.get(r.to) + ")" });
  else seen.set(r.to, r.id);
}

console.log(`Restores planned: ${restores.length}`);
console.log(`Collisions detected: ${collisions.length}`);
if (collisions.length) { collisions.forEach(c => console.log("  ⚠️", c.to, "|", c.name, "->", c.conflictWith)); }

// write undo file
const undo = restores.map(r => ({ id: r.id, sku: r.from }));
fs.writeFileSync(join(__dirname, "_undo_skus.json"), JSON.stringify(undo, null, 2));
console.log(`Undo file written: scratch/_undo_skus.json (${undo.length} entries)`);

if (!APPLY) { console.log("\nDRY-RUN only. Re-run with --apply to write."); process.exit(0); }
if (collisions.length) { console.log("\n❌ Aborting apply due to collisions."); process.exit(1); }

console.log("\nApplying updates...");
let ok = 0, fail = 0;
for (const r of restores) {
  const { error: ue } = await supabase.from("parts").update({ sku: r.to }).eq("id", r.id);
  if (ue) { console.error("  ❌", r.name, ue.message); fail++; }
  else ok++;
}
console.log(`\n✅ Updated ${ok} | ❌ Failed ${fail}`);
