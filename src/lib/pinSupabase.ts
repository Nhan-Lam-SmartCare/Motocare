// Supabase client cho Pin Factory Database
import { createClient } from "@supabase/supabase-js";

const PIN_SUPABASE_URL = "https://jvigqtcbtzaxmrdsbfru.supabase.co";
const PIN_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2aWdxdGNidHpheG1yZHNiZnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDk2NjksImV4cCI6MjA3NzkyNTY2OX0.6pKHKqzoayfmt4Dx_WwPc92Sx1YaFnFX_fFyHsPL2Zw";

export const pinSupabase = createClient(
  PIN_SUPABASE_URL,
  PIN_SUPABASE_ANON_KEY
);

// Types cho Pin cash transactions
export interface PinCashTransaction {
  id: string;
  type: "income" | "expense";
  category?: string;
  amount: number;
  date: string;
  description?: string;
  payment_method?: string;
  created_at?: string;
}

// Fetch cash transactions từ Pin DB
// NOTE: loại trừ id bắt đầu bằng "MOTO-" vì đó là bản mirror sync từ Motocare
// để tránh đếm trùng khi hiển thị số Pin riêng.
export async function fetchPinCashTransactions(): Promise<
  PinCashTransaction[]
> {
  const { data, error } = await pinSupabase
    .from("cashtransactions")
    .select("*")
    .not("id", "like", "MOTO-%")
    .order("date", { ascending: false });

  if (error) {
    console.error("[PinSupabase] Error fetching transactions:", error);
    return [];
  }

  return data || [];
}

// Fetch số dư ban đầu từ Pin payment_sources
export async function fetchPinInitialBalance(branchId: string = "CN1"): Promise<{
  cash: number;
  bank: number;
}> {
  const { data, error } = await pinSupabase
    .from("payment_sources")
    .select("id, balance")
    .in("id", ["cash", "bank"]);

  if (error) {
    console.error("[PinSupabase] Error fetching initial balance:", error);
    return { cash: 0, bank: 0 };
  }

  const cashSource = data?.find((ps) => ps.id === "cash");
  const bankSource = data?.find((ps) => ps.id === "bank");

  return {
    cash: cashSource?.balance?.[branchId] || 0,
    bank: bankSource?.balance?.[branchId] || 0,
  };
}

// Fetch tổng số dư từ Pin DB (chia theo tiền mặt và ngân hàng)
// NOTE: Lấy số dư trực tiếp từ payment_sources.balance để khớp với app Pin.
// App Pin không tính delta từ transactions mà dùng balance đã được cập nhật/reconcile.
export async function fetchPinBalanceSummary(branchId: string = "CN1"): Promise<{
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cash: number;
  bank: number;
}> {
  // Lấy statistics thu/chi (cho mục đích hiển thị, không dùng tính balance)
  const { data, error } = await pinSupabase
    .from("cashtransactions")
    .select("type, amount")
    .not("id", "like", "MOTO-%");

  if (error) {
    console.error("[PinSupabase] Error fetching transactions:", error);
  }

  const totalIncome = (data || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const totalExpense = (data || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // Lấy số dư thực tế từ payment_sources (đã được app Pin reconcile/cập nhật)
  const currentBalance = await fetchPinInitialBalance(branchId);
  console.log("[PinSupabase] Current balance from payment_sources: cash=", currentBalance.cash, "bank=", currentBalance.bank);

  return {
    totalIncome,
    totalExpense,
    balance: currentBalance.cash + currentBalance.bank,
    cash: currentBalance.cash,
    bank: currentBalance.bank,
  };
}
