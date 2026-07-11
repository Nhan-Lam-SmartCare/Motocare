import { describe, it, expect, vi } from "vitest";
import * as client from "../../src/supabaseClient";
import {
  fetchCashTransactions,
  createCashTransaction,
} from "../../src/lib/repository/cashTransactionsRepository";

// Mocks
// fetchCashTransactions builds a chainable query: .select().order().eq?/.gte?/.lte?.range()
// and awaits the terminal .range(); createCashTransaction does .insert().select().single().
const mockFrom = vi.fn();
let nextSelectResult: { data: any; error: any } | null = null;

function makeSelectQuery() {
  const result = nextSelectResult ?? { data: [], error: null };
  nextSelectResult = null;
  const q: any = {
    select: () => q,
    order: () => q,
    eq: () => q,
    gte: () => q,
    lte: () => q,
    range: () => Promise.resolve(result),
  };
  return q;
}

vi.spyOn(client, "supabase", "get").mockReturnValue({ from: mockFrom } as any);

mockFrom.mockImplementation((_table: string) => ({
  select: () => makeSelectQuery(),
  insert: (rows: any[]) => ({
    select: () => ({ single: () => ({ data: rows[0], error: null }) }),
  }),
}));

function injectSelectErrorOnce(errorMsg: string) {
  nextSelectResult = { data: null, error: { message: errorMsg } };
}

describe("cashTransactionsRepository", () => {
  it("fetchCashTransactions success", async () => {
    const res = await fetchCashTransactions();
    expect(res.ok).toBe(true);
    if (res.ok) expect(Array.isArray(res.data)).toBe(true);
  });

  it("createCashTransaction success", async () => {
    const res = await createCashTransaction({
      type: "income",
      amount: 100000,
      branchId: "CN1",
      paymentSourceId: "cash",
      category: "general_income",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.amount).toBe(100000);
  });

  it("fetchCashTransactions supabase error", async () => {
    injectSelectErrorOnce("DB error");
    const res = await fetchCashTransactions();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("supabase");
  });

  it("createCashTransaction validation error when missing amount", async () => {
    const res = await createCashTransaction({
      type: "income",
      amount: 0,
      branchId: "CN1",
      paymentSourceId: "cash",
    } as any);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("validation");
  });
});
