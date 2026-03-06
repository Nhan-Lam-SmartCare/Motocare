import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uluxycppxlzdskyklgqt.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU5MzIsImV4cCI6MjA3ODA4MTkzMn0.pCmr1LEfsiPnvWKeTjGX4zGgUOYbwaLoKe1Qzy5jbdk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching Bando...");
    const { data: parts, error } = await supabase.from("parts").select("*").ilike("name", "%Bando%");
    if (error) {
        console.error("Error", error);
        return;
    }
    fs.writeFileSync("bando_parts.json", JSON.stringify(parts, null, 2));
    console.log("Found " + (parts?.length || 0) + " items");

    // Let's also fetch ALL items without limit by looping range
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from("parts").select("*").range(from, from + 999);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log("True total count in DB: " + all.length);
}
main().then(() => process.exit(0));
