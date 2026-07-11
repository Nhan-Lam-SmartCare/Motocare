// Generate src/types/database.types.ts from the live PostgREST OpenAPI schema.
// Usage: node scripts/maintenance/gen-supabase-types.mjs
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or VITE_* equivalents) in .env.
//
// This is a lightweight stand-in for `supabase gen types typescript` (which needs
// a Supabase access token / DB password we don't keep locally). It derives Row/
// Insert/Update types from the REST OpenAPI definitions. See docs/C_FRONTEND_PLAN.md
// for how to adopt these types incrementally (createClient<Database>).
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Columns that are per-branch JSONB maps of { [branchId]: number } in this app.
// Typing them as Record<string, number> makes the common `stock?.[branch]` pattern
// type-check, instead of the opaque `Json`.
const PER_BRANCH_NUMBER_COLS = new Set([
  "stock", "reservedstock", "reserved", "retailPrice", "wholesalePrice",
  "costPrice", "minstock", "balance",
]);

function tsType(colName, prop) {
  if (PER_BRANCH_NUMBER_COLS.has(colName)) return "Record<string, number>";
  const f = (prop.format || "").toLowerCase();
  const t = prop.type;
  if (f.includes("json")) return "Json";
  if (["integer", "bigint", "numeric", "double precision", "real", "smallint", "double"].some((x) => f.includes(x))) return "number";
  if (f === "boolean" || t === "boolean") return "boolean";
  if (t === "array") return "Json";
  return "string";
}

const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
const spec = await res.json();
const defs = spec.definitions || {};
const tableNames = Object.keys(defs).sort();

let out = `// AUTO-GENERATED from PostgREST OpenAPI. Do not edit by hand.
// Regenerate: node scripts/maintenance/gen-supabase-types.mjs
// Adoption guide: docs/C_FRONTEND_PLAN.md

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;

for (const name of tableNames) {
  const def = defs[name];
  const props = def.properties || {};
  const required = new Set(def.required || []);
  const cols = Object.keys(props);
  const row = cols.map((c) => `          ${JSON.stringify(c)}: ${tsType(c, props[c])}${required.has(c) ? "" : " | null"}`);
  const ins = cols.map((c) => `          ${JSON.stringify(c)}${!required.has(c) || c === "id" || c === "created_at" ? "?" : ""}: ${tsType(c, props[c])}${required.has(c) ? "" : " | null"}`);
  const upd = cols.map((c) => `          ${JSON.stringify(c)}?: ${tsType(c, props[c])}${required.has(c) ? "" : " | null"}`);
  out += `      ${JSON.stringify(name)}: {
        Row: {
${row.join(";\n")}
        };
        Insert: {
${ins.join(";\n")}
        };
        Update: {
${upd.join(";\n")}
        };
        Relationships: [];
      };
`;
}

out += `    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
`;

const outPath = path.join(__dirname, "..", "..", "src", "types", "database.types.ts");
fs.writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${tableNames.length} tables).`);
