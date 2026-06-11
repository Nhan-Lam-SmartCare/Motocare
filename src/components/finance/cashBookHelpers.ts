import { formatCashTxCategory } from "../../lib/finance/cashTxCategories";
import type { CashTransaction } from "../../types";

export const getCategoryLabel = (category?: string) => {
    if (!category) return "--";
    return formatCashTxCategory(category) || category;
};

export const INCOME_CATEGORIES = new Set([
    "sale_income",
    "service_income",
    "other_income",
    "debt_collection",
    "service_deposit",
    "employee_advance_repayment",
    "general_income",
    "deposit",
]);

export const EXPENSE_CATEGORIES = new Set([
    "inventory_purchase",
    "supplier_payment",
    "debt_payment",
    "salary",
    "employee_advance",
    "loan_payment",
    "rent",
    "utilities",
    "outsourcing",
    "service_cost",
    "sale_refund",
    "other_expense",
    "general_expense",
]);

export const isIncomeTx = (tx: CashTransaction) => {
    const normalizedCategory = String(tx.category || "").trim().toLowerCase();

    // Priority 1: Check expense categories first (more specific)
    if (EXPENSE_CATEGORIES.has(normalizedCategory)) return false;

    // Priority 2: Check income categories
    if (INCOME_CATEGORIES.has(normalizedCategory)) return true;

    // Priority 3: Fallback to type field only if category not recognized
    return tx.type === "income" || tx.type === "deposit";
};