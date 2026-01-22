import { useEffect, useCallback } from 'react';

interface KeyboardShortcutConfig {
    /** Callback when Ctrl/Cmd+N is pressed (Create new) */
    onCreateNew?: () => void;
    /** Callback when Ctrl/Cmd+F is pressed (Focus search) */
    onFocusSearch?: () => void;
    /** Callback when Ctrl/Cmd+P is pressed (Print) */
    onPrint?: () => void;
    /** Callback when Escape is pressed (Close modal) */
    onEscape?: () => void;
    /** Whether shortcuts are enabled (default: true) */
    enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for power users
 * 
 * Supported shortcuts:
 * - Ctrl/Cmd+N: Create new item
 * - Ctrl/Cmd+F: Focus search input
 * - Ctrl/Cmd+P: Print current item
 * - Escape: Close modal/popup
 */
export function useKeyboardShortcuts({
    onCreateNew,
    onFocusSearch,
    onPrint,
    onEscape,
    enabled = true,
}: KeyboardShortcutConfig) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Check if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            // Handle Escape (works even when typing)
            if (event.key === 'Escape' && onEscape) {
                event.preventDefault();
                onEscape();
                return;
            }

            // Don't trigger shortcuts when typing (except Escape)
            if (isTyping && !isCtrlOrCmd) return;

            // Ctrl/Cmd+N: Create new
            if (isCtrlOrCmd && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                onCreateNew?.();
                return;
            }

            // Ctrl/Cmd+F: Focus search
            if (isCtrlOrCmd && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                onFocusSearch?.();
                return;
            }

            // Ctrl/Cmd+P: Print
            if (isCtrlOrCmd && event.key.toLowerCase() === 'p') {
                event.preventDefault();
                onPrint?.();
                return;
            }
        },
        [enabled, onCreateNew, onFocusSearch, onPrint, onEscape]
    );

    useEffect(() => {
        if (!enabled) return;

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, handleKeyDown]);
}

/**
 * Hook to persist and restore filters from URL search params
 */
export function useUrlFilters<T extends Record<string, string>>(
    defaultFilters: T,
    setSearchParams: (params: URLSearchParams) => void,
    searchParams: URLSearchParams
): {
    filters: T;
    setFilter: (key: keyof T, value: string) => void;
    setFilters: (newFilters: Partial<T>) => void;
    resetFilters: () => void;
} {
    // Read filters from URL or use defaults
    const filters = {} as T;
    for (const key of Object.keys(defaultFilters) as (keyof T)[]) {
        const urlValue = searchParams.get(key as string);
        filters[key] = (urlValue ?? defaultFilters[key]) as T[keyof T];
    }

    const setFilter = useCallback(
        (key: keyof T, value: string) => {
            const newParams = new URLSearchParams(searchParams);
            if (value === defaultFilters[key] || value === '' || value === 'all') {
                newParams.delete(key as string);
            } else {
                newParams.set(key as string, value);
            }
            setSearchParams(newParams);
        },
        [searchParams, setSearchParams, defaultFilters]
    );

    const setFilters = useCallback(
        (newFilters: Partial<T>) => {
            const newParams = new URLSearchParams(searchParams);
            for (const [key, value] of Object.entries(newFilters)) {
                if (value === defaultFilters[key as keyof T] || value === '' || value === 'all') {
                    newParams.delete(key);
                } else {
                    newParams.set(key, value as string);
                }
            }
            setSearchParams(newParams);
        },
        [searchParams, setSearchParams, defaultFilters]
    );

    const resetFilters = useCallback(() => {
        setSearchParams(new URLSearchParams());
    }, [setSearchParams]);

    return { filters, setFilter, setFilters, resetFilters };
}
