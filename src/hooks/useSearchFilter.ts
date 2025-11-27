import { useState, useCallback } from "react";

interface UseSearchFilterProps<T> {
  items: T[];
  searchFields: (keyof T)[];
}

/**
 * useSearchFilter hook - Tìm kiếm và lọc items
 * Cung cấp các utility để search/filter danh sách
 */
export function useSearchFilter<T extends Record<string, unknown>>({
  items,
  searchFields,
}: UseSearchFilterProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return searchFields.some((field) => {
      const value = item[field];
      if (value == null) return false;
      return String(value).toLowerCase().includes(query);
    });
  });

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    clearSearch,
    hasResults: filteredItems.length > 0,
    resultCount: filteredItems.length,
  };
}

export default useSearchFilter;
