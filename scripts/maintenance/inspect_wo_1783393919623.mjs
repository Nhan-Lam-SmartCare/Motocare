import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const v1 = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: wo, error } = await v1
  .from("work_orders")
  .select("id, creationdate, paymentdate, status, paymentstatus, total, totalpaid, discount")
  .eq("id", "1783393919623")
  .single();

if (error) { console.error(error.message); process.exit(1); }
console.log(JSON.stringify(wo, null, 2));

const { data: txs } = await v1
  .from("cash_transactions")
  .select("id, date, type, category, amount, description")
  .ilike("description", "%1783393919623%")
  .order("date");
for (const t of txs || []) {
  console.log(`${t.date} | ${t.type} | ${t.category} | ${Number(t.amount).toLocaleString("vi-VN")}đ | ${t.description.slice(0, 60)}`);
}
