import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function standardize() {
  console.log("🚀 Starting batch standardization of existing product SKUs...");

  // 1. Fetch categories to get prefixes
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, sku_prefix");

  if (catError) {
    console.error("❌ Error fetching categories:", catError);
    return;
  }

  const prefixMap = {};
  categories.forEach(c => {
    if (c.sku_prefix) {
      prefixMap[c.name] = c.sku_prefix;
    }
  });

  // 2. Fetch all products
  const { data: parts, error: partsError } = await supabase
    .from("parts")
    .select("id, name, sku, category")
    .order("created_at");

  if (partsError) {
    console.error("❌ Error fetching parts:", partsError);
    return;
  }

  console.log(`📦 Found ${parts.length} products in database.`);

  // Keep track of counts per prefix to generate serial numbers (e.g. HON-0001, HON-0002)
  const serialCounts = {};

  let updatedCount = 0;

  for (const part of parts) {
    const catName = part.category;
    const prefix = prefixMap[catName] || "GEN"; // Fallback to GEN if category has no prefix
    
    // Initialize counter for this prefix
    if (!serialCounts[prefix]) {
      serialCounts[prefix] = 1;
    }

    const nextSerial = String(serialCounts[prefix]++).padStart(4, "0");
    const newSku = `${prefix}-${nextSerial}`;

    // Only update if the SKU has changed (to avoid unnecessary writes)
    if (part.sku !== newSku) {
      console.log(`🔄 Standardizing: "${part.name}" | Old SKU: ${part.sku} -> New SKU: ${newSku}`);
      
      const { error: updateErr } = await supabase
        .from("parts")
        .update({ sku: newSku })
        .eq("id", part.id);

      if (updateErr) {
        console.error(`❌ Error updating SKU for "${part.name}":`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 Completed standardizing SKUs. Updated ${updatedCount} products successfully!`);
}

standardize();
