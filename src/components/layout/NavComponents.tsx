import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  ShoppingCart as Cart,
  Boxes,
  Users,
  Settings,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAppContext } from "../../contexts/AppContext";
import { USER_ROLES } from "../../constants";
import { NAV_COLORS } from "./NavColors";
import type { ColorKey } from "./NavColors";

// Mobile Drawer Link Component
export const MobileDrawerLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  color: ColorKey;
  onClick?: () => void;
}> = ({ to, icon, label, color, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const colorConfig = NAV_COLORS[color as ColorKey] || NAV_COLORS.slate;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive
          ? `${colorConfig.bg} ${colorConfig.text} shadow-sm`
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
        }`}
    >
      <div className={`${isActive ? colorConfig.text : ""}`}>{icon}</div>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

// Mobile Nav Link Component
export const MobileNavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const getDarkHeaderColor = (key: ColorKey) => {
  const mapping: Record<ColorKey, { activeText: string; activeBg: string; hoverBg: string; activeBorder: string }> = {
    blue: {
      activeText: "text-blue-400 font-semibold",
      activeBg: "bg-blue-500/10 border-blue-500/10",
      activeBorder: "bg-blue-400",
      hoverBg: "hover:bg-blue-500/5 hover:text-blue-300"
    },
    violet: {
      activeText: "text-violet-400 font-semibold",
      activeBg: "bg-violet-500/10 border-violet-500/10",
      activeBorder: "bg-violet-400",
      hoverBg: "hover:bg-violet-500/5 hover:text-violet-300"
    },
    emerald: {
      activeText: "text-emerald-400 font-semibold",
      activeBg: "bg-emerald-500/10 border-emerald-500/10",
      activeBorder: "bg-emerald-400",
      hoverBg: "hover:bg-emerald-500/5 hover:text-emerald-300"
    },
    amber: {
      activeText: "text-amber-400 font-semibold",
      activeBg: "bg-amber-500/10 border-amber-500/10",
      activeBorder: "bg-amber-400",
      hoverBg: "hover:bg-amber-500/5 hover:text-amber-300"
    },
    cyan: {
      activeText: "text-cyan-400 font-semibold",
      activeBg: "bg-cyan-500/10 border-cyan-500/10",
      activeBorder: "bg-cyan-400",
      hoverBg: "hover:bg-cyan-500/5 hover:text-cyan-300"
    },
    indigo: {
      activeText: "text-indigo-400 font-semibold",
      activeBg: "bg-indigo-500/10 border-indigo-500/10",
      activeBorder: "bg-indigo-400",
      hoverBg: "hover:bg-indigo-500/5 hover:text-indigo-300"
    },
    rose: {
      activeText: "text-rose-400 font-semibold",
      activeBg: "bg-rose-500/10 border-rose-500/10",
      activeBorder: "bg-rose-400",
      hoverBg: "hover:bg-rose-500/5 hover:text-rose-300"
    },
    orange: {
      activeText: "text-orange-400 font-semibold",
      activeBg: "bg-orange-500/10 border-orange-500/10",
      activeBorder: "bg-orange-400",
      hoverBg: "hover:bg-orange-500/5 hover:text-orange-300"
    },
    teal: {
      activeText: "text-teal-400 font-semibold",
      activeBg: "bg-teal-500/10 border-teal-500/10",
      activeBorder: "bg-teal-400",
      hoverBg: "hover:bg-teal-500/5 hover:text-teal-300"
    },
    fuchsia: {
      activeText: "text-fuchsia-400 font-semibold",
      activeBg: "bg-fuchsia-500/10 border-fuchsia-500/10",
      activeBorder: "bg-fuchsia-400",
      hoverBg: "hover:bg-fuchsia-500/5 hover:text-fuchsia-300"
    },
    slate: {
      activeText: "text-slate-300 font-semibold",
      activeBg: "bg-slate-500/10 border-slate-500/10",
      activeBorder: "bg-slate-300",
      hoverBg: "hover:bg-slate-500/5 hover:text-slate-200"
    }
  };
  return mapping[key] || mapping.slate;
};

// Desktop NavLink Component
export const NavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  colorKey: ColorKey;
}> = ({ to, icon, label, colorKey }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const colors = getDarkHeaderColor(colorKey);

  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg border transition-all duration-300 ease-out select-none ${
        isActive
          ? `${colors.activeBg} ${colors.activeText} border-white/5 shadow-inner`
          : `border-transparent text-slate-400 ${colors.hoverBg}`
      }`}
    >
      {/* Icon with micro-bounce on hover / glow on active */}
      <span className={`flex items-center justify-center transition-transform duration-300 ${
        isActive ? "scale-105 filter drop-shadow-[0_0_8px_currentColor]" : "group-hover:scale-105"
      }`}>
        {icon}
      </span>
      
      {/* Label */}
      <span className={`text-[10.5px] font-medium tracking-tight whitespace-nowrap transition-colors duration-300`}>
        {label}
      </span>

      {/* Subtle indicator bar at the bottom */}
      {isActive && (
        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full ${colors.activeBorder} opacity-80`} />
      )}
    </Link>
  );
};

// Bottom Navigation Bar for Mobile
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const { showMobileMenu, setShowMobileMenu } = useAppContext();
  const role = profile?.role;
  const isOwnerOrManager =
    role === USER_ROLES.OWNER || role === USER_ROLES.MANAGER;

  const navItems = [
    {
      to: isOwnerOrManager ? "/dashboard" : "/staff-dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "Tổng",
      color: "blue" as ColorKey,
    },
    {
      to: "/service",
      icon: <Wrench className="w-5 h-5" />,
      label: "Phiếu SC",
      color: "blue" as ColorKey,
    },
    {
      to: "/sales",
      icon: <Cart className="w-5 h-5" />,
      label: "Bán",
      color: "emerald" as ColorKey,
    },
    {
      to: "/customers",
      icon: <Users className="w-5 h-5" />,
      label: "Khách",
      color: "cyan" as ColorKey,
    },
    {
      to: "/inventory",
      icon: <Boxes className="w-5 h-5" />,
      label: "Kho",
      color: "amber" as ColorKey,
    },
    {
      to: "/settings",
      icon: <Settings className="w-5 h-5" />,
      label: "Thêm",
      color: "slate" as ColorKey,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
      {/* Backdrop blur effect for modern look */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg -z-10"></div>

      <div className="grid grid-cols-6 gap-0.5 px-1 py-1.5">
        {navItems.map((item) => {
          const isSettings = item.to === "/settings";
          const isActive = isSettings
            ? showMobileMenu
            : (item.to === "/dashboard" || item.to === "/staff-dashboard"
              ? location.pathname === "/dashboard" || location.pathname === "/staff-dashboard"
              : location.pathname.startsWith(item.to));
          const colorKey = item.color;
          const colorConfig = NAV_COLORS[colorKey] || NAV_COLORS.slate;

          const buttonClass = `flex flex-col items-center gap-0.5 py-1 px-1 rounded-2xl transition-all duration-200 ${
            isActive
              ? `${colorConfig.bg} ${colorConfig.text} font-semibold shadow-sm scale-102`
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 active:scale-95"
          }`;

          if (isSettings) {
            return (
              <button
                key={item.to}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={buttonClass}
                type="button"
              >
                <div className="transition-transform duration-200">
                  {item.icon}
                </div>
                <span className="text-[9px] font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={buttonClass}
            >
              <div className="transition-transform duration-200">
                {item.icon}
              </div>
              <span className="text-[9px] font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
