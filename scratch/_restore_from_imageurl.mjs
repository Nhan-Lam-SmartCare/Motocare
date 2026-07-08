import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const APPLY = process.argv.includes("--apply");

// Ground-truth: old dump (by id) to measure imageUrl reliability
const dump = JSON.parse(fs.readFileSync(join(__dirname, "_parts_dump_0530.json"), "utf8"));
const dumpById = new Map(dump.map(p => [p.id, (p.sku || "").trim()]));

// Extract SKU-looking code from an imageUrl basename
function skuFromImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/\/([^\/]+)\.(?:jpg|jpeg|png|webp|gif)$/i);
  if (!m) return null;
  const base = m[1].trim();
  // looks like a manufacturer code: has a digit and a hyphen, not a std HON-/YAM- code, not a Vietnamese name
  if (!/\d/.test(base)) return null;
  if (!/[-]/.test(base)) return null;
  if (/^(HON|YAM|LUB|WHL|REP|ELE|NHO|PGA|VOR|IRC|CAS|KEN|SUZ|HCT|NHX|GS|XED|GEN)-\d{3,4}$/i.test(base)) return null;
  // reject auto-generated upload filenames: <13-digit epoch>-<random> (not a real SKU)
  if (/^\d{12,}(-|$)/.test(base)) return null;
  return base;
}

// ---- Live current Honda/Yamaha parts ----
const { data: cur, error } = await supabase.from("parts").select("id, name, sku, category, \"imageUrl\"").in("category", ["Honda", "Yamaha"]);
if (error) { console.error(error); process.exit(1); }

// ---- All current SKUs for collision detection ----
const { data: allParts, error: e2 } = await supabase.from("parts").select("id, sku");
if (e2) { console.error(e2); process.exit(1); }

// ---- VALIDATION: on parts already restored (in dump), does imageUrl basename == true old sku? ----
let vMatch = 0, vMismatch = 0, vNoImg = 0;
const mismatches = [];
for (const p of cur) {
  const trueSku = dumpById.get(p.id);
  if (!trueSku) continue; // not in dump = the leftover group
  const fromImg = skuFromImageUrl(p.imageUrl);
  if (!fromImg) { vNoImg++; continue; }
  if (fromImg === trueSku) vMatch++;
  else { vMismatch++; mismatches.push({ name: p.name, trueSku, fromImg }); }
}
console.log("=== RELIABILITY CHECK (against 05-30 dump ground truth) ===");
console.log(`imageUrl basename == true old SKU : ${vMatch}`);
console.log(`mismatch                          : ${vMismatch}`);
console.log(`no code in imageUrl               : ${vNoImg}`);
if (mismatches.length) mismatches.slice(0, 15).forEach(m => console.log(`   ⚠️ ${m.name}: true=${m.trueSku} img=${m.fromImg}`));

// ---- TARGET: parts still standardized (HON-/YAM-\d{4}) that have a code in imageUrl ----
const isStd = s => /^(HON|YAM)-\d{4}$/.test(s || "");
const targets = [];
for (const p of cur) {
  if (!isStd(p.sku)) continue;
  const fromImg = skuFromImageUrl(p.imageUrl);
  if (!fromImg) continue;
  if (fromImg === p.sku) continue;
  targets.push({ id: p.id, name: p.name, category: p.category, from: p.sku, to: fromImg, imageUrl: p.imageUrl });
}

// collision checks
const targetIds = new Set(targets.map(t => t.id));
const externalSkus = new Map();
allParts.forEach(p => { if (!targetIds.has(p.id) && p.sku) externalSkus.set(p.sku, p.id); });
const seen = new Map();
const collisions = [];
for (const t of targets) {
  if (externalSkus.has(t.to)) collisions.push({ ...t, conflictWith: "external " + externalSkus.get(t.to) });
  if (seen.has(t.to)) collisions.push({ ...t, conflictWith: "dup-in-batch" });
  else seen.set(t.to, t.id);
}

// leftovers still standardized but NO usable imageUrl
const stillStd = cur.filter(p => isStd(p.sku));
const noSource = stillStd.filter(p => !skuFromImageUrl(p.imageUrl));

console.log(`\n=== PLAN ===`);
console.log(`Still standardized (HON-/YAM-xxxx) : ${stillStd.length}`);
console.log(`  → can restore from imageUrl      : ${targets.length}`);
console.log(`  → NO code in imageUrl (skip)     : ${noSource.length}`);
console.log(`Collisions                          : ${collisions.length}`);
if (collisions.length) collisions.forEach(c => console.log(`   ⚠️ ${c.to} | ${c.name} -> ${c.conflictWith}`));
console.log(`\n--- will restore ---`);
targets.forEach(t => console.log(`[${t.category}] ${t.from} -> ${t.to} | ${t.name}`));
if (noSource.length) {
  console.log(`\n--- no source, will stay as-is ---`);
  noSource.forEach(p => console.log(`[${p.category}] ${p.sku} | ${p.name} | imageUrl=${p.imageUrl ?? "null"}`));
}

// undo file
const undo = targets.map(t => ({ id: t.id, sku: t.from }));
fs.writeFileSync(join(__dirname, "_undo_skus_imageurl.json"), JSON.stringify(undo, null, 2));
console.log(`\nUndo file: scratch/_undo_skus_imageurl.json (${undo.length})`);

if (!APPLY) { console.log("\nDRY-RUN only. Re-run with --apply to write."); process.exit(0); }
if (collisions.length) { console.log("\n❌ Aborting: collisions present."); process.exit(1); }
if (vMismatch > 0) { console.log("\n⚠️ Reliability mismatches present — review before apply. Aborting."); process.exit(1); }

console.log("\nApplying...");
let ok = 0, fail = 0;
for (const t of targets) {
  const { error: ue } = await supabase.from("parts").update({ sku: t.to }).eq("id", t.id);
  if (ue) { console.error("  ❌", t.name, ue.message); fail++; } else ok++;
}
console.log(`\n✅ Updated ${ok} | ❌ Failed ${fail}`);
