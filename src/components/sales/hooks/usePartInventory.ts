import { useState, useMemo } from "react";
import type { Part } from "../../../types";
import { getCategoryColor } from "../utils/categoryColors";
import { getAvailableStock } from "../../../lib/repository/partsRepository";

export type StockFilter = "all" | "low" | "out";

const LOW_STOCK_THRESHOLD = 5;

export interface UsePartInventoryReturn {
    // State
    partSearch: string;
    stockFilter: StockFilter;

    // Actions
    setPartSearch: (search: string) => void;
    setStockFilter: (filter: StockFilter) => void;

    // Helper
    getCategoryColor: typeof getCategoryColor;

    // Computed
    repoParts: Part[];
    filteredParts: Part[];
    displayedParts: Part[];
}

/**
 * Custom hook for managing part inventory display and filtering
 */
export function usePartInventory(
    repoParts: Part[],
    currentBranchId: string,
    loadingParts: boolean,
    partsError: any
): UsePartInventoryReturn {
    const [partSearch, setPartSearch] = useState("");
    const [stockFilter, setStockFilter] = useState<StockFilter>("all");

    // Filter parts by search
    const filteredParts = useMemo(() => {
        if (loadingParts || partsError) return [];
        let filtered = repoParts;

        if (partSearch) {
            filtered = filtered.filter(
                (part) =>
                    part.name.toLowerCase().includes(partSearch.toLowerCase()) ||
                    part.sku.toLowerCase().includes(partSearch.toLowerCase())
            );
        }

        return filtered;
    }, [repoParts, partSearch, loadingParts, partsError]);

    // Apply stock filter and sort
    const displayedParts = useMemo(() => {
        if (!filteredParts.length) return [];

        const normalized = filteredParts.filter((part) => {
            const branchStock = getAvailableStock(part, currentBranchId);
            if (stockFilter === "low") {
                return branchStock > 0 && branchStock <= LOW_STOCK_THRESHOLD;
            }
            if (stockFilter === "out") {
                return branchStock <= 0;
            }
            return true;
        });

        const weight = (stock: number) => {
            if (stock <= 0) return 2;
            if (stock <= LOW_STOCK_THRESHOLD) return 1;
            return 0;
        };

        return normalized
            .slice()
            .sort((a, b) => {
                const aStock = getAvailableStock(a, currentBranchId);
                const bStock = getAvailableStock(b, currentBranchId);
                const weightDiff = weight(aStock) - weight(bStock);
                if (weightDiff !== 0) return weightDiff;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 36);
    }, [filteredParts, stockFilter, currentBranchId]);

    return {
        // State
        partSearch,
        stockFilter,

        // Actions
        setPartSearch,
        setStockFilter,

        // Helper
        getCategoryColor,

        // Computed
        repoParts,
        filteredParts,
        displayedParts,
    };
}
