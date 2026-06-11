import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to this script's location
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDdgImages(query) {
  try {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    
    const match = html.match(/vqd=["']([^"']+)["']/);
    if (!match) {
      console.error("Could not find vqd token for query:", query);
      return [];
    }
    const vqd = match[1];
    
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://duckduckgo.com/"
      }
    });
    const data = await searchResponse.json();
    if (data.results && data.results.length > 0) {
      const urls = [];
      for (const res of data.results) {
        if (res.image && res.image.startsWith("http")) {
          urls.push(res.image);
        }
      }
      return urls;
    }
  } catch (err) {
    console.error("DuckDuckGo fetch error for query:", query, err.message);
  }
  return [];
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    return false;
  }
}

// 1. Fetch missing parts
const { data: parts, error } = await supabase
  .from("parts")
  .select("id, name, sku, category, imageUrl")
  .order("name");

if (error) {
  console.error("Error fetching parts:", error);
  process.exit(1);
}

const productsDir = path.resolve(__dirname, "../public/images/products");
const extensions = [".webp", ".png", ".jpg", ".jpeg"];

const missing = [];
const existingButNoDb = [];

for (const part of parts) {
  // Check if a local file exists on disk
  let localExists = false;
  let foundExt = "";
  if (part.sku) {
    for (const ext of extensions) {
      if (fs.existsSync(path.join(productsDir, `${part.sku}${ext}`))) {
        localExists = true;
        foundExt = ext;
        break;
      }
    }
  }

  if (localExists) {
    // If local file exists, but DB imageUrl is not matched, sync it
    const expectedDbPath = `/images/products/${part.sku}${foundExt}`;
    if (part.imageUrl !== expectedDbPath) {
      existingButNoDb.push({ part, ext: foundExt });
    }
  } else {
    // If local file does NOT exist on disk, consider it missing (even if DB is populated)
    missing.push(part);
  }
}

console.log(`Total parts missing DB imageUrl but have local file: ${existingButNoDb.length}`);
console.log(`Total parts completely missing images: ${missing.length}`);

// Sync existing local files to DB first
if (existingButNoDb.length > 0) {
  console.log("Syncing existing local files to database...");
  for (const item of existingButNoDb) {
    const dbPath = `/images/products/${item.part.sku}${item.ext}`;
    console.log(`Syncing: "${item.part.name}" -> ${dbPath}`);
    const { error: updateError } = await supabase
      .from("parts")
      .update({ imageUrl: dbPath })
      .eq("id", item.part.id);
      
    if (updateError) {
      console.error(`❌ DB Sync failed for ${item.part.name}:`, updateError.message);
    }
  }
  console.log("DB Sync complete!");
}

if (missing.length === 0) {
  console.log("No missing images found! All set.");
} else {
  // Batch of 20 items
  const BATCH_SIZE = 20;
  const batch = missing.slice(0, BATCH_SIZE);

  let successCount = 0;

  for (const part of batch) {
    let query = part.name;
    if (part.category && part.category !== "Hàng Công Ty" && part.category !== "Khác") {
      query += ` ${part.category}`;
    }
    query += " xe máy";

    console.log(`Processing: "${part.name}" (SKU: ${part.sku}) -> Search: "${query}"`);

    const imageUrls = await getDdgImages(query);
    if (imageUrls.length === 0) {
      console.log(`❌ No images found for: "${part.name}"`);
      continue;
    }

    let downloaded = false;
    let dbPath = "";

    // Try up to 5 image options from the search results
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      const imageUrl = imageUrls[i];
      console.log(`Trying option ${i + 1}/${Math.min(imageUrls.length, 5)}: ${imageUrl}`);
      
      let ext = ".jpg";
      if (imageUrl.toLowerCase().endsWith(".png")) ext = ".png";
      if (imageUrl.toLowerCase().endsWith(".webp")) ext = ".webp";
      
      const destFile = `${part.sku}${ext}`;
      const destPath = path.join(productsDir, destFile);
      dbPath = `/images/products/${destFile}`;

      const ok = await downloadImage(imageUrl, destPath);
      if (ok) {
        console.log(`✅ Downloaded to: ${destPath}`);
        downloaded = true;
        break;
      } else {
        console.log(`❌ Option ${i + 1} failed.`);
      }
    }

    if (downloaded) {
      const { error: updateError } = await supabase
        .from("parts")
        .update({ imageUrl: dbPath })
        .eq("id", part.id);
        
      if (updateError) {
        console.error(`❌ DB Update failed for ${part.name}:`, updateError.message);
      } else {
        console.log(`✅ DB Updated with path: ${dbPath}`);
        successCount++;
      }
    } else {
      console.log(`❌ All options failed for: "${part.name}"`);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`Batch finished. Successfully updated ${successCount}/${batch.length} parts.`);
}

process.exit(0);
