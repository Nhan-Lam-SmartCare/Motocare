import { useState, useCallback, useMemo } from 'react';

type HistoryType = 'customer_name' | 'license_plate' | 'vehicle_model' | 'phone';

const HISTORY_KEY_PREFIX = 'motocare_input_history_';
const MAX_HISTORY_ITEMS = 50;

interface UseInputHistoryReturn {
    suggestions: string[];
    addToHistory: (value: string) => void;
    getSuggestions: (query: string) => string[];
    clearHistory: () => void;
}

/**
 * Hook for managing input history and auto-complete suggestions
 * @param type - The type of input field (used as localStorage key suffix)
 */
export function useInputHistory(type: HistoryType): UseInputHistoryReturn {
    const storageKey = `${HISTORY_KEY_PREFIX}${type}`;

    // Load history from localStorage
    const loadHistory = useCallback((): string[] => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return [];
            return JSON.parse(stored) as string[];
        } catch {
            return [];
        }
    }, [storageKey]);

    // Save history to localStorage
    const saveHistory = useCallback((history: string[]) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(history));
        } catch {
            // Ignore storage errors
        }
    }, [storageKey]);

    // Add a new value to history
    const addToHistory = useCallback((value: string) => {
        if (!value || !value.trim()) return;

        const normalizedValue = value.trim();
        const currentHistory = loadHistory();

        // Remove duplicate if exists
        const filteredHistory = currentHistory.filter(
            (item) => item.toLowerCase() !== normalizedValue.toLowerCase()
        );

        // Add to beginning (most recent first)
        const newHistory = [normalizedValue, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
        saveHistory(newHistory);
    }, [loadHistory, saveHistory]);

    // Get suggestions matching a query
    const getSuggestions = useCallback((query: string): string[] => {
        if (!query || query.length < 1) return [];

        const normalizedQuery = query.toLowerCase().trim();
        const history = loadHistory();

        return history
            .filter((item) => item.toLowerCase().includes(normalizedQuery))
            .slice(0, 8); // Limit to 8 suggestions
    }, [loadHistory]);

    // Clear all history for this type
    const clearHistory = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
        } catch {
            // Ignore
        }
    }, [storageKey]);

    // Memoized initial empty suggestions
    const suggestions = useMemo(() => [] as string[], []);

    return {
        suggestions,
        addToHistory,
        getSuggestions,
        clearHistory,
    };
}

/**
 * Convenience hook that also tracks query state and provides live suggestions
 */
export function useAutoComplete(type: HistoryType) {
    const [query, setQuery] = useState('');
    const { addToHistory, getSuggestions, clearHistory } = useInputHistory(type);

    const suggestions = useMemo(() => getSuggestions(query), [getSuggestions, query]);

    const handleChange = useCallback((value: string) => {
        setQuery(value);
    }, []);

    const handleSelect = useCallback((value: string) => {
        setQuery(value);
        addToHistory(value);
    }, [addToHistory]);

    const handleSubmit = useCallback(() => {
        if (query.trim()) {
            addToHistory(query);
        }
    }, [query, addToHistory]);

    return {
        query,
        setQuery: handleChange,
        suggestions,
        handleSelect,
        handleSubmit,
        clearHistory,
    };
}
