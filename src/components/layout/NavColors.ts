export type ColorKey =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "cyan"
  | "indigo"
  | "rose"
  | "orange"
  | "teal"
  | "fuchsia"
  | "slate";

export const NAV_COLORS: Record<
  ColorKey,
  { text: string; bg: string; hoverBg: string }
> = {
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/30",
    hoverBg: "hover:bg-cyan-50 dark:hover:bg-cyan-900/20",
  },
  indigo: {
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
    hoverBg: "hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/30",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
  },
  orange: {
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
  },
  teal: {
    text: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/30",
    hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-900/20",
  },
  fuchsia: {
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-900/30",
    hoverBg: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20",
  },
  slate: {
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/30",
    hoverBg: "hover:bg-slate-50 dark:hover:bg-slate-900/20",
  },
};
