import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  ShoppingCart as Cart,
  Boxes,
  Users,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
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

// Desktop NavLink Component
export const NavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  colorKey: ColorKey;
}> = ({ to, icon, label, colorKey }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-md transition ${isActive
          ? "bg-white/20 text-white font-bold"
          : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
    </Link>
  );
};

// Bottom Navigation Bar for Mobile
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role;
  const isOwnerOrManager =
    role === USER_ROLES.OWNER || role === USER_ROLES.MANAGER;

  // Hide bottom nav on inventory and sales page for mobile (they have their own internal tabs)
  if (location.pathname === "/inventory" || location.pathname === "/sales") {
    return null;
  }

  const allNavItems = [
    {
      to: "/dashboard",
      icon: <LayoutDashboard className="w-6 h-6" />,
      label: "Tổng quan",
      color: "blue",
      show: isOwnerOrManager,
    },
    {
      to: "/service",
      icon: <Wrench className="w-6 h-6" />,
      label: "Sửa chữa",
      color: "violet",
      show: true,
    },
    {
      to: "/sales",
      icon: <Cart className="w-6 h-6" />,
      label: "Bán hàng",
      color: "emerald",
      show: true,
    },
    {
      to: "/inventory",
      icon: <Boxes className="w-6 h-6" />,
      label: "Kho",
      color: "amber",
      show: isOwnerOrManager,
    },
    {
      to: "/customers",
      icon: <Users className="w-6 h-6" />,
      label: "Khách hàng",
      color: "cyan",
      show: true,
    },
  ];

  const navItems = allNavItems.filter((item) => item.show);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
      {/* Backdrop blur effect for modern look */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg -z-10"></div>

      <div
        className={`grid gap-1 px-2 py-2 ${navItems.length === 3
            ? "grid-cols-3"
            : navItems.length === 4
              ? "grid-cols-4"
              : "grid-cols-5"
          }`}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const colorKey = item.color as ColorKey;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200 ${isActive
                  ? `${NAV_COLORS[colorKey].bg} ${NAV_COLORS[colorKey].text}`
                  : "text-slate-600 dark:text-slate-400 active:scale-95"
                }`}
            >
              <div
                className={`transition-transform ${isActive ? "scale-105" : ""
                  }`}
              >
                {React.cloneElement(
                  item.icon as React.ReactElement<{ className?: string }>,
                  {
                    className: "w-6 h-6",
                  }
                )}
              </div>
              <span
                className={`text-[9px] font-medium truncate w-full text-center ${isActive ? "font-semibold" : ""
                  }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
