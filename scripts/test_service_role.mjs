import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uluxycppxlzdskyklgqt.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUwNTkzMiwiZXhwIjoyMDc4MDgxOTMyfQ.dJ--iUVVw5rPbn9fjErGV-681fwUOnfz8Ut7OluO8Ws";

// Use service role key
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    const partId = "9e863795-68aa-4064-bf59-bfc8dbc54933"; // Bi nồi Vison
    console.log("Updating Bi noi Vison using Service Role...");

    // Test wholesaleprice
    const { data: updated1, error: err1 } = await supabase.from("parts").update({ "wholesaleprice": { CN1: 122142 } }).eq("id", partId).select();
    console.log("Result with wholesaleprice:", updated1, err1);

    // Test wholesalePrice
    const { data: updated2, error: err2 } = await supabase.from("parts").update({ "wholesalePrice": { CN1: 122143 } }).eq("id", partId).select();
    console.log("Result with wholesalePrice:", updated2, err2);
}
main();
