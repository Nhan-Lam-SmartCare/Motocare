import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uluxycppxlzdskyklgqt.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU5MzIsImV4cCI6MjA3ODA4MTkzMn0.pCmr1LEfsiPnvWKeTjGX4zGgUOYbwaLoKe1Qzy5jbdk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    const { data: parts, error } = await supabase.from("parts").select("*");
    if (error) {
        console.error(error);
        return;
    }
    fs.writeFileSync("parts_dump.json", JSON.stringify(parts, null, 2));
    console.log("Dumped " + parts.length + " parts to parts_dump.json");
}
main();
