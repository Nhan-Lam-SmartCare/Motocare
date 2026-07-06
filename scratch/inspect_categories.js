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

async function inspect() {
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*");
    
  if (catError) {
    console.error("Error categories:", catError);
    return;
  }
  
  const { data: parts, error: partsError } = await supabase
    .from("parts")
    .select("category")
    .limit(1000);
    
  if (partsError) {
    console.error("Error parts:", partsError);
    return;
  }

  // Count parts per category
  const counts = {};
  parts.forEach(p => {
    const cat = p.category || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  console.log("=== DB CATEGORIES ===");
  console.log(JSON.stringify(categories, null, 2));
  
  console.log("\n=== PARTS CATEGORIES COUNTS ===");
  console.log(JSON.stringify(counts, null, 2));
}

inspect();
