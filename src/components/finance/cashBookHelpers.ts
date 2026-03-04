import { formatCashTxCategory } from "../../lib/finance/cashTxCategories";

export const getCategoryLabel = (category?: string) => {
    if (!category) return "--";
    return formatCashTxCategory(category) || category;
};