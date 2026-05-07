import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const email = process.env.SUPABASE_EMAIL || process.env.TEST_EMAIL_NHAN;
const password = process.env.SUPABASE_PASSWORD || process.env.TEST_PASS_NHAN;

if (!email || !password) {
  console.error(
    "Missing credentials. Set SUPABASE_EMAIL and SUPABASE_PASSWORD before running."
  );
  process.exit(1);
}

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9/.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const rules = [
  {
    category: "Lốp - Săm - Ruột",
    confidence: "high",
    patterns: [
      /\blop\b/,
      /\bvo\b.*\b(khong sam|co sam|xe|[0-9]{2,3}\/[0-9]{2,3}|[0-9]+x[0-9])/,
      /\bsam\b/,
      /\bruot xe\b/,
      /\birc tire\b/,
      /\bkenda\b/,
      /\bcasumina\b/,
    ],
  },
  {
    category: "Dầu nhớt - Dung dịch",
    confidence: "high",
    patterns: [
      /\bnhot\b/,
      /\bdau (hop so|phuoc|thang|may)\b/,
      /\bbrake fluid\b/,
      /\bdung dich\b/,
      /\bnuoc mat\b/,
      /\bvoltronic\b/,
      /\bvotronic\b/,
      /\brexoil\b/,
      /\belf\b/,
      /\btotal\b/,
      /\b10w[0-9]{2}\b/,
      /\b15w[0-9]{2}\b/,
    ],
  },
  {
    category: "Phanh - Thắng",
    confidence: "high",
    patterns: [
      /\bphanh\b/,
      /\bthang\b/,
      /\bbo dia\b/,
      /\bbo thang\b/,
      /\bma phanh\b/,
      /\bheo dau\b/,
      /\bxy lanh phanh\b/,
      /\bxylanh phanh\b/,
      /\bdia thang\b/,
      /\btay thang\b/,
    ],
  },
  {
    category: "Truyền động - Nồi - Dây curoa",
    confidence: "high",
    patterns: [
      /\bcuroa\b/,
      /\bday curoa\b/,
      /\bnoi\b/,
      /\bly hop\b/,
      /\bbi vang\b/,
      /\bguoc vang\b/,
      /\bchuong\b/,
      /\bpuly\b/,
      /\bpulley\b/,
      /\bnhong\b/,
      /\bxich\b/,
      /\bsen\b/,
      /\blip\b/,
      /\bbo la\b/,
      /\bchen bi\b/,
      /\bcui dia\b/,
      /\bong chi cui dia\b/,
      /\btan buly\b/,
      /\btam chan bi\b/,
      /\bbanh rang do toc do\b/,
    ],
  },
  {
    category: "Lọc gió - Lọc nhớt - Lọc xăng",
    confidence: "high",
    patterns: [
      /\bloc gio\b/,
      /\btam loc\b/,
      /\bmut loc\b/,
      /\bruot loc\b/,
      /\bloc nhot\b/,
      /\bloc xang\b/,
      /\bluoi loc\b/,
    ],
  },
  {
    category: "Điện - Đèn - Còi",
    confidence: "high",
    patterns: [
      /\bden\b/,
      /\bled\b/,
      /\bbong den\b/,
      /\bic\b/,
      /\bmobin\b/,
      /\bbobin\b/,
      /\brole\b/,
      /\brele\b/,
      /\bro le\b/,
      /\btiet che\b/,
      /\bchinh luu\b/,
      /\bcuon dien\b/,
      /\bday dien\b/,
      /\bcuon day may phat\b/,
      /\bcong tac\b/,
      /\bcoi\b/,
      /\bcau chi\b/,
      /\bchop nhan\b/,
      /\bchop keu\b/,
      /\bchui ro le\b/,
      /\bcuc keu\b/,
      /\bcuc tingtong\b/,
      /\bstop\b/,
      /\bbong mui\b/,
      /\bbong so\b/,
      /\bac quy\b/,
      /\bbinh pin\b/,
      /\bsac\b/,
      /\bmo to\b/,
      /\bmotor\b/,
      /\bbom xang\b/,
      /\bchui nguon\b/,
      /\bchui cai\b/,
      /\baptomat\b/,
      /\bpin\b/,
    ],
  },
  {
    category: "Tay lái - Gương - Khóa - Dây điều khiển",
    confidence: "high",
    patterns: [
      /\btay lai\b/,
      /\bdau tay\b/,
      /\bguong\b/,
      /\bkinh\b/,
      /\bkhoa\b/,
      /\bday ga\b/,
      /\bday thang\b/,
      /\bday con\b/,
      /\bday le\b/,
      /\bbao tay\b/,
      /\bboc tay ga\b/,
      /\bday cong to\b/,
      /\bday km\b/,
      /\bday bao so\b/,
      /\bcuon ga\b/,
      /\bcum ben phai\b/,
      /\bcan so\b/,
      /\bcan sang so\b/,
      /\btay con\b/,
      /\btay ga\b/,
      /\btay nam\b/,
    ],
  },
  {
    category: "Nhiên liệu - Bình xăng - Bơm xăng",
    confidence: "medium",
    patterns: [
      /\bbinh xang\b/,
      /\bco xang\b/,
      /\bda bom\b/,
      /\bbom xang\b/,
      /\bday coc lien binh dau\b/,
      /\bbinh dau\b/,
      /\bphao bao xang\b/,
      /\bday xang\b/,
    ],
  },
  {
    category: "Nhựa - Dàn áo - Tem",
    confidence: "medium",
    patterns: [
      /\bop\b/,
      /\bnap\b/,
      /\bmat na\b/,
      /\bdan ao\b/,
      /\byem\b/,
      /\bchan bun\b/,
      /\bde chan\b/,
      /\btem\b/,
      /\bcang\b/,
      /\bcop\b/,
      /\bbo e\b/,
      /\bda yen\b/,
      /\bmark\b/,
      /\btam phan quang\b/,
    ],
  },
  {
    category: "Động cơ - Ron - Phớt - Bạc đạn",
    confidence: "medium",
    patterns: [
      /\bpiston\b/,
      /\bxupap\b/,
      /\bsupap\b/,
      /\bxy lanh\b/,
      /\bxylanh\b/,
      /\bgiang\b/,
      /\bgioang\b/,
      /\bron\b/,
      /\bphot\b/,
      /\bbac dan\b/,
      /\bvong bi\b/,
      /\bbugi\b/,
      /\bbom nhot\b/,
      /\bmay de\b/,
      /\bcu de\b/,
      /\bde cos\b/,
      /\bchoi than\b/,
      /\bcan dap may\b/,
      /\bcot treo may\b/,
      /\bchat tay rua carbon\b/,
      /\bcanh quat\b/,
      /\bgac may\b/,
      /\bthuoc tham dau\b/,
    ],
  },
  {
    category: "Khung sườn - Phuộc - Chân chống",
    confidence: "medium",
    patterns: [
      /\bphuoc\b/,
      /\bphuot\b/,
      /\bgiam xoc\b/,
      /\bgiam chan\b/,
      /\bgap\b/,
      /\bchan chong\b/,
      /\bgac chan\b/,
      /\bcan khoi dong\b/,
      /\bkhung\b/,
      /\bcang\b/,
      /\bbat phuoc\b/,
      /\bchen co\b/,
      /\bchong dung\b/,
      /\bchong nghieng\b/,
      /\bchong nghiên\b/,
      /\bchong ngang\b/,
      /\bcot dum\b/,
      /\btruc banh\b/,
      /\bvan banh\b/,
      /\bvoi xe\b/,
      /\bbanh long\b/,
      /\bbac thao\b/,
      /\bcuc canh banh\b/,
      /\bcay chiu ma dum\b/,
      /\bcot ma dum\b/,
    ],
  },
  {
    category: "Ốc vít - Cao su - Vật tư nhỏ",
    confidence: "medium",
    patterns: [
      /\boc\b/,
      /\bvit\b/,
      /\bbu long\b/,
      /\bbulong\b/,
      /\blong den\b/,
      /\bcao su\b/,
      /\bdem\b/,
      /\bkep\b/,
      /\bchot\b/,
      /\blo xo\b/,
      /\bvong thun\b/,
      /\bphe\b/,
      /\bpat\b/,
      /\bmoc\b/,
    ],
  },
  {
    category: "Xe điện",
    confidence: "medium",
    patterns: [
      /\bxe dien\b/,
      /\bxmen\b/,
      /\b48v\b/,
      /\b60v\b/,
      /\b72v\b/,
      /\bdong co dien\b/,
      /\bban dap\b/,
      /\bgio dap\b/,
    ],
  },
];

const csvValue = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const classifyPart = (part) => {
  const text = normalize([part.name, part.sku, part.category].join(" "));
  const rule = rules.find((item) => has(text, item.patterns));
  if (rule) {
    return {
      suggestedCategory: rule.category,
      confidence: rule.confidence,
    };
  }
  return {
    suggestedCategory: "Khác - Cần rà soát",
    confidence: "low",
  };
};

const {
  data: { user },
  error: loginError,
} = await supabase.auth.signInWithPassword({ email, password });

if (loginError) {
  console.error("Login failed:", loginError.message);
  process.exit(1);
}

const { data: parts, error } = await supabase
  .from("parts")
  .select("id,name,sku,category,stock")
  .order("name");

if (error) {
  console.error("Error fetching parts:", error.message);
  process.exit(1);
}

const rows = (parts || []).map((part) => {
  const suggestion = classifyPart(part);
  return {
    id: part.id,
    sku: part.sku || "",
    name: part.name || "",
    currentCategory: part.category || "",
    suggestedCategory: suggestion.suggestedCategory,
    confidence: suggestion.confidence,
    stockCN1: part.stock?.CN1 ?? 0,
    changed: (part.category || "") !== suggestion.suggestedCategory ? "yes" : "no",
  };
});

const outputDir = join(process.cwd(), "exports");
mkdirSync(outputDir, { recursive: true });

const headers = [
  "id",
  "sku",
  "name",
  "currentCategory",
  "suggestedCategory",
  "confidence",
  "stockCN1",
  "changed",
];

const csv = [
  headers.join(","),
  ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
].join("\n");

writeFileSync(join(outputDir, "part_category_suggestions.csv"), csv, "utf8");
writeFileSync(
  join(outputDir, "part_category_suggestions.json"),
  JSON.stringify(rows, null, 2),
  "utf8"
);

const summary = rows.reduce((acc, row) => {
  const key = row.suggestedCategory;
  acc[key] ||= { total: 0, high: 0, medium: 0, low: 0, changed: 0 };
  acc[key].total += 1;
  acc[key][row.confidence] += 1;
  if (row.changed === "yes") acc[key].changed += 1;
  return acc;
}, {});

console.log(`Logged in as: ${user.email}`);
console.log(`Analyzed ${rows.length} parts.`);
console.table(
  Object.entries(summary)
    .map(([category, values]) => ({ category, ...values }))
    .sort((a, b) => b.total - a.total)
);
console.log("Wrote exports/part_category_suggestions.csv");
console.log("Wrote exports/part_category_suggestions.json");
