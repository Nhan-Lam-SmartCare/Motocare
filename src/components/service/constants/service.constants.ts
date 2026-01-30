/**
 * Service-related constants
 * Extracted from ServiceManager.tsx for better organization
 */

/**
 * Popular motorcycle models in Vietnam
 * Used for vehicle model autocomplete/suggestions
 * Comprehensive list covering all major brands
 */
export const POPULAR_MOTORCYCLES = [
  // === HONDA ===
  // Xe số
  "Honda Wave Alpha",
  "Honda Wave RSX",
  "Honda Wave RSX FI",
  "Honda Wave 110",
  "Honda Wave S110",
  "Honda Super Dream",
  "Honda Dream",
  "Honda Blade 110",
  "Honda Future 125",
  "Honda Future Neo",
  // Xe côn tay
  "Honda Winner X",
  "Honda Winner 150",
  "Honda CB150R",
  "Honda CB150X",
  "Honda CB300R",
  "Honda CB500F",
  "Honda CB650R",
  "Honda CBR150R",
  "Honda CBR250RR",
  "Honda CBR500R",
  "Honda CBR650R",
  "Honda Rebel 300",
  "Honda Rebel 500",
  "Honda CRF150L",
  "Honda CRF250L",
  "Honda CRF300L",
  "Honda XR150L",
  // Xe tay ga
  "Honda Vision",
  "Honda Air Blade 125",
  "Honda Air Blade 150",
  "Honda Air Blade 160",
  "Honda SH Mode 125",
  "Honda SH 125i",
  "Honda SH 150i",
  "Honda SH 160i",
  "Honda SH 350i",
  "Honda Lead 125",
  "Honda PCX 125",
  "Honda PCX 160",
  "Honda Vario 125",
  "Honda Vario 150",
  "Honda Vario 160",
  "Honda ADV 150",
  "Honda ADV 160",
  "Honda ADV 350",
  "Honda Forza 250",
  "Honda Forza 300",
  "Honda Forza 350",
  "Honda Giorno",
  "Honda Stylo 160",
  // Xe cũ/ngưng sản xuất
  "Honda @",
  "Honda Click",
  "Honda Dylan",
  "Honda PS",
  "Honda Spacy",
  "Honda SCR",
  "Honda NSR",
  "Honda Astrea",
  "Honda Cub 50",
  "Honda Cub 70",
  "Honda Cub 81",
  "Honda Cub 82",
  "Honda Cub 86",
  "Honda Super Cub",
  "Honda Dream II",
  "Honda Dream Thái",

  // === YAMAHA ===
  // Xe số
  "Yamaha Sirius",
  "Yamaha Sirius FI",
  "Yamaha Sirius RC",
  "Yamaha Jupiter",
  "Yamaha Jupiter FI",
  "Yamaha Jupiter Finn",
  "Yamaha Jupiter MX",
  // Xe côn tay
  "Yamaha Exciter 135",
  "Yamaha Exciter 150",
  "Yamaha Exciter 155",
  "Yamaha FZ150i",
  "Yamaha FZ155i",
  "Yamaha MT-03",
  "Yamaha MT-07",
  "Yamaha MT-09",
  "Yamaha MT-10",
  "Yamaha MT-15",
  "Yamaha R15",
  "Yamaha R3",
  "Yamaha R6",
  "Yamaha R7",
  "Yamaha XSR155",
  "Yamaha XSR700",
  "Yamaha XSR900",
  "Yamaha WR155R",
  "Yamaha TFX 150",
  // Xe tay ga
  "Yamaha Grande",
  "Yamaha Grande Hybrid",
  "Yamaha Janus",
  "Yamaha FreeGo",
  "Yamaha FreeGo S",
  "Yamaha Latte",
  "Yamaha NVX 125",
  "Yamaha NVX 155",
  "Yamaha NVX 155 VVA",
  "Yamaha NMAX",
  "Yamaha NMAX 155",
  "Yamaha XMAX 300",
  "Yamaha TMAX 530",
  "Yamaha TMAX 560",
  "Yamaha Lexi",
  "Yamaha Aerox",
  // Xe cũ/ngưng sản xuất
  "Yamaha Nouvo",
  "Yamaha Nouvo LX",
  "Yamaha Nouvo SX",
  "Yamaha Mio",
  "Yamaha Mio Classico",
  "Yamaha Mio Ultimo",
  "Yamaha Taurus",
  "Yamaha Spark",
  "Yamaha Force",

  // === SUZUKI ===
  // Xe số
  "Suzuki Axelo",
  "Suzuki Viva",
  "Suzuki Best",
  "Suzuki Smash",
  "Suzuki Sport",
  "Suzuki Revo",
  // Xe côn tay
  "Suzuki Raider 150",
  "Suzuki Raider R150",
  "Suzuki Satria F150",
  "Suzuki GSX-R150",
  "Suzuki GSX-S150",
  "Suzuki GSX-R1000",
  "Suzuki GSX-S1000",
  "Suzuki Gixxer 150",
  "Suzuki Gixxer 250",
  "Suzuki V-Strom 250",
  "Suzuki V-Strom 650",
  "Suzuki V-Strom 1050",
  "Suzuki Intruder 150",
  "Suzuki Bandit 150",
  // Xe tay ga
  "Suzuki Address",
  "Suzuki Address 110",
  "Suzuki Impulse",
  "Suzuki Burgman Street",
  "Suzuki Burgman 125",
  "Suzuki Burgman 200",
  "Suzuki Burgman 400",
  "Suzuki Avenis",
  // Xe cũ
  "Suzuki GN125",
  "Suzuki GD110",
  "Suzuki EN150",
  "Suzuki Hayate",
  "Suzuki Sky Drive",
  "Suzuki Sapphire",

  // === SYM ===
  "SYM Elegant",
  "SYM Elite 50",
  "SYM Attila",
  "SYM Attila Venus",
  "SYM Attila Elizabeth",
  "SYM Angela",
  "SYM Galaxy",
  "SYM Star SR",
  "SYM Shark",
  "SYM Shark Mini",
  "SYM Passing",
  "SYM X-Pro",
  "SYM Abela",
  "SYM Husky",

  // === PIAGGIO & VESPA ===
  "Piaggio Liberty",
  "Piaggio Liberty 50",
  "Piaggio Liberty 125",
  "Piaggio Liberty 150",
  "Piaggio Medley",
  "Piaggio Medley 125",
  "Piaggio Medley 150",
  "Piaggio Beverly",
  "Piaggio MP3",
  "Piaggio Zip",
  "Vespa Sprint",
  "Vespa Sprint 125",
  "Vespa Sprint 150",
  "Vespa Primavera",
  "Vespa Primavera 125",
  "Vespa Primavera 150",
  "Vespa LX",
  "Vespa S",
  "Vespa GTS",
  "Vespa GTS 125",
  "Vespa GTS 300",
  "Vespa GTV",
  "Vespa Sei Giorni",

  // === KYMCO ===
  "Kymco Like",
  "Kymco Like 125",
  "Kymco Like 150",
  "Kymco Many",
  "Kymco Many 50",
  "Kymco Many 110",
  "Kymco Many 125",
  "Kymco Jockey",
  "Kymco Candy",
  "Kymco People S",
  "Kymco AK550",
  "Kymco X-Town 300",
  "Kymco Downtown",
  "Kymco Visar",

  // === VINFAST (Xe điện) ===
  "VinFast Klara",
  "VinFast Klara A1",
  "VinFast Klara A2",
  "VinFast Klara S",
  "VinFast Ludo",
  "VinFast Impes",
  "VinFast Tempest",
  "VinFast Vento",
  "VinFast Evo200",
  "VinFast Feliz",
  "VinFast Feliz S",
  "VinFast Theon",
  "VinFast Theon S",

  // === YADEA (Xe điện) ===
  "Yadea Xmen Neo",
  "Yadea Ulike",
  "Yadea G5",
  "Yadea Sunra X7",
  "Yadea Odora",

  // === PEGA (Xe điện) ===
  "Pega eSH",
  "Pega NewTech",
  "Pega Cap A",
  "Pega X-Men",
  "Pega Aura",

  // === Khác ===
  "Xe điện khác",
  "Xe 50cc khác",
  "Xe nhập khẩu khác",
  "Khác",
] as const;

export type MotorcycleModel = (typeof POPULAR_MOTORCYCLES)[number];

/**
 * Filter input CSS class
 */
export const FILTER_INPUT_CLASS =
    "px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200";

/**
 * Page size for pagination
 */
export const PAGE_SIZE = 20;

/**
 * Default fetch limit for work orders
 */
export const DEFAULT_FETCH_LIMIT = 100;

/**
 * Default date range in days
 */
export const DEFAULT_DATE_RANGE_DAYS = 7;
