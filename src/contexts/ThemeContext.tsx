import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStoreSettings } from "../hooks/useStoreSettings";

type Theme = 'light' | 'dark';

type BrandPreset = "logo" | "blue" | "emerald" | "amber" | "custom";

const BRAND_PRESETS: Record<Exclude<BrandPreset, "custom">, { primary: string; secondary: string }> = {
  logo: { primary: "16 185 129", secondary: "245 158 11" }, // emerald-500 / amber-500
  blue: { primary: "59 130 246", secondary: "37 99 235" }, // blue-500 / blue-600
  emerald: { primary: "16 185 129", secondary: "5 150 105" }, // emerald-500 / emerald-600
  amber: { primary: "245 158 11", secondary: "217 119 6" }, // amber-500 / amber-600
};

const hexToRgb = (hex?: string): string | null => {
  if (!hex) return null;
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
};

const darkenRgb = (rgb: string, ratio = 0.15) => {
  const [r, g, b] = rgb.split(" ").map((v) => Number(v));
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `${clamp(Math.round(r * (1 - ratio)))} ${clamp(
    Math.round(g * (1 - ratio))
  )} ${clamp(Math.round(b * (1 - ratio)))}`;
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  const { data: storeSettings } = useStoreSettings();

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0f172a'); // slate-900
    } else {
      document.documentElement.classList.remove('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#ffffff'); // white
    }
  }, [theme]);

  useEffect(() => {
    const preset = (storeSettings?.theme_preset as BrandPreset) || "blue";
    const customRgb = hexToRgb(storeSettings?.primary_color);

    let primary = BRAND_PRESETS.blue.primary;
    let secondary = BRAND_PRESETS.blue.secondary;

    if (preset === "custom" && customRgb) {
      primary = customRgb;
      secondary = darkenRgb(customRgb, 0.18);
    } else if (preset in BRAND_PRESETS) {
      const mapped = BRAND_PRESETS[preset as Exclude<BrandPreset, "custom">];
      primary = mapped.primary;
      secondary = mapped.secondary;
    }

    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-secondary", secondary);
  }, [storeSettings?.theme_preset, storeSettings?.primary_color]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
