import React from "react";
import { LucideIcon } from "lucide-react";
import { CARD_COLORS } from "./statCard.constants";
import type { CardColorKey } from "./statCard.constants";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    colorKey: CardColorKey;
    icon: LucideIcon;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    colorKey,
    icon: Icon,
}) => {
    const colors = CARD_COLORS[colorKey];

    return (
        <div className={`rounded-2xl p-4 md:p-5 shadow-sm ${colors.card}`}>
            <div className="flex items-center gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-xl ${colors.icon}`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                    <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <h3 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
                            {value}
                        </h3>
                    </div>
                    {subtitle && (
                        <p className={`text-xs mt-1 ${colors.accent}`}>{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatCard;
