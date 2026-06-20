import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .or(`vehicles::text.ilike.%66g126870%`);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found customers count:", data?.length);
    console.log("Customer data:", JSON.stringify(data, null, 2));
  }
}

run();
