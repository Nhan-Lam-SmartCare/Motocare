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
export async function fetchPinCashTransactions(): Promise<
  PinCashTransaction[]
> {
  const { data, error } = await pinSupabase
    .from("cashtransactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("[PinSupabase] Error fetching transactions:", error);
    return [];
  }

  return data || [];
}

// Fetch tổng số dư từ Pin DB (chia theo tiền mặt và ngân hàng)
export async function fetchPinBalanceSummary(): Promise<{
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cash: number;
  bank: number;
}> {
  const isMissingColumn = (err: any, col: string) =>
    typeof err?.message === "string" && err.message.toLowerCase().includes(col.toLowerCase());

  let data: any[] | null = null;

  // Attempt 1: include payment_method if it exists
  {
    const res = await pinSupabase
      .from("cashtransactions")
      .select("type, amount, payment_method");

    if (!res.error) {
      data = res.data || [];
    } else if (isMissingColumn(res.error, "payment_method")) {
      // Attempt 2: fall back to minimal fields
      const res2 = await pinSupabase
        .from("cashtransactions")
        .select("type, amount");
      if (res2.error) {
        console.error("[PinSupabase] Error fetching balance:", res2.error);
        return { totalIncome: 0, totalExpense: 0, balance: 0, cash: 0, bank: 0 };
      }
      data = res2.data || [];
    } else {
      console.error("[PinSupabase] Error fetching balance:", res.error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, cash: 0, bank: 0 };
    }
  }

  const totalIncome = (data || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const totalExpense = (data || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // Tính số dư tiền mặt
  const cashIncome = (data || [])
    .filter((t) => t.type === "income" && (t.payment_method === "cash" || !t.payment_method))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const cashExpense = (data || [])
    .filter((t) => t.type === "expense" && (t.payment_method === "cash" || !t.payment_method))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // Tính số dư ngân hàng
  const bankIncome = (data || [])
    .filter((t) => t.type === "income" && t.payment_method === "bank")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const bankExpense = (data || [])
    .filter((t) => t.type === "expense" && t.payment_method === "bank")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    cash: cashIncome - cashExpense,
    bank: bankIncome - bankExpense,
  };
}
