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

// Define the parent categories to create
const PARENTS = [
  { name: "Dầu nhớt & Phụ gia", icon: "droplet", color: "#3b82f6", sku_prefix: "LUB" },
  { name: "Săm & Lốp", icon: "disc", color: "#ef4444", sku_prefix: "WHL" },
  { name: "Phụ tùng thay thế", icon: "settings", color: "#10b981", sku_prefix: "REP" },
  { name: "Hệ thống điện & Ắc quy", icon: "zap", color: "#f59e0b", sku_prefix: "ELE" }
];

// Define how existing categories map to the parent names & their subcategory SKU prefixes
const MAPPING = {
  "Nhớt": { parentName: "Dầu nhớt & Phụ gia", sku_prefix: "NHO" },
  "Phụ Gia": { parentName: "Dầu nhớt & Phụ gia", sku_prefix: "PGA" },
  
  "Vỏ và ruột": { parentName: "Săm & Lốp", sku_prefix: "VOR" },
  "IRC Tire": { parentName: "Săm & Lốp", sku_prefix: "IRC" },
  "Casumina": { parentName: "Săm & Lốp", sku_prefix: "CAS" },
  "Kenda": { parentName: "Săm & Lốp", sku_prefix: "KEN" },
  
  "Honda": { parentName: "Phụ tùng thay thế", sku_prefix: "HON" },
  "Yamaha": { parentName: "Phụ tùng thay thế", sku_prefix: "YAM" },
  "Suzuki": { parentName: "Phụ tùng thay thế", sku_prefix: "SUZ" },
  "Hàng Công Ty": { parentName: "Phụ tùng thay thế", sku_prefix: "HCT" },
  "Nhông Xích": { parentName: "Phụ tùng thay thế", sku_prefix: "NHX" },
  
  "Ắc quy GS": { parentName: "Hệ thống điện & Ắc quy", sku_prefix: "GS" },
  "Phụ tùng xe điện": { parentName: "Hệ thống điện & Ắc quy", sku_prefix: "XED" }
};

async function migrate() {
  console.log("🚀 Starting automatic category taxonomy migration...");

  // 1. Fetch current categories to check what already exists
  const { data: existingCats, error: fetchErr } = await supabase
    .from("categories")
    .select("*");

  if (fetchErr) {
    console.error("❌ Error fetching categories:", fetchErr);
    return;
  }

  const catMapByName = {};
  existingCats.forEach(c => {
    catMapByName[c.name] = c;
  });

  // 2. Create parent categories if they do not exist
  const parentIds = {};
  for (const parent of PARENTS) {
    if (catMapByName[parent.name]) {
      console.log(`ℹ️ Parent category "${parent.name}" already exists.`);
      parentIds[parent.name] = catMapByName[parent.name].id;
    } else {
      console.log(`➕ Creating parent category: "${parent.name}"...`);
      const newId = crypto?.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
      
      const { data, error } = await supabase
        .from("categories")
        .insert({
          id: newId,
          name: parent.name,
          icon: parent.icon,
          color: parent.color,
          sku_prefix: parent.sku_prefix
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating parent category "${parent.name}":`, error);
        return;
      }

      console.log(`✅ Created parent category "${parent.name}" successfully.`);
      parentIds[parent.name] = data.id;
    }
  }

  // 3. Map subcategories to their parents and assign subcategory SKU prefixes
  console.log("\n🔄 Mapping subcategories to parents and updating SKU prefixes...");
  for (const subName of Object.keys(MAPPING)) {
    const config = MAPPING[subName];
    const category = catMapByName[subName];
    
    if (!category) {
      console.log(`⚠️ Warning: Existing category "${subName}" not found in DB, skipping mapping.`);
      continue;
    }

    const parentId = parentIds[config.parentName];
    if (!parentId) {
      console.error(`❌ Error: Parent ID for "${config.parentName}" not found.`);
      continue;
    }

    console.log(`🔗 Mapping "${subName}" -> Parent: "${config.parentName}" (SKU Prefix: ${config.sku_prefix})`);
    
    const { error: updateErr } = await supabase
      .from("categories")
      .update({
        parent_id: parentId,
        sku_prefix: config.sku_prefix
      })
      .eq("id", category.id);

    if (updateErr) {
      console.error(`❌ Error updating category "${subName}":`, updateErr);
    } else {
      console.log(`✅ Mapped "${subName}" successfully.`);
    }
  }

  console.log("\n🎉 Automatic category taxonomy migration completed successfully!");
}

migrate();
