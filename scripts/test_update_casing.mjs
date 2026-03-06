import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uluxycppxlzdskyklgqt.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU5MzIsImV4cCI6MjA3ODA4MTkzMn0.pCmr1LEfsiPnvWKeTjGX4zGgUOYbwaLoKe1Qzy5jbdk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const partId = "9e863795-68aa-4064-bf59-bfc8dbc54933"; // Bi nồi Vison
    console.log("Updating Bi noi Vison...");
    const { data: updated1, error: err1 } = await supabase.from("parts").update({ wholesaleprice: { CN1: 122142 } }).eq("id", partId).select();
    console.log("Result with wholesaleprice:", updated1, err1);

    const { data: updated2, error: err2 } = await supabase.from("parts").update({ "wholesalePrice": { CN1: 122143 } }).eq("id", partId).select();
    console.log("Result with wholesalePrice:", updated2, err2);
}
main();
