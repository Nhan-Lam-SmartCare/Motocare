import React from "react";
import { motion } from "framer-motion";

interface TetBannerProps {
    compact?: boolean;
}

const TetBanner: React.FC<TetBannerProps> = ({ compact }) => {
    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-red-600 to-yellow-500 rounded-xl p-3 text-white shadow-md flex items-center justify-between overflow-hidden relative mb-4"
            >
                <div className="absolute top-0 right-0 opacity-10 text-4xl transform translate-x-1/4 -translate-y-1/4">
                    🌸
                </div>
                <div className="flex items-center gap-2 z-10">
                    <span className="text-xl">🐍</span>
                    <div>
                        <h3 className="font-bold text-sm md:text-base leading-tight">
                            Xuân Ất Tỵ 2025
                        </h3>
                        <p className="text-[10px] md:text-xs text-yellow-100 opacity-90">
                            Chúc Mừng Năm Mới
                        </p>
                    </div>
                </div>
                <div className="flex gap-1 text-lg z-10">
                    <span>🧧</span>
                    <span>💰</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-yellow-500 p-6 text-white shadow-xl mb-6"
        >
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 text-9xl opacity-10">
                🌸
            </div>
            <div className="absolute bottom-0 left-0 -ml-4 -mb-4 text-8xl opacity-10">
                🌼
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left Side: Greeting */}
                <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="bg-yellow-400 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Tết 2026
                        </span>
                        <span className="text-yellow-200 text-xs">Year of the Horse</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold mb-1 drop-shadow-md">
                        Chúc Mừng Năm Mới
                    </h1>
                    <p className="text-yellow-100 text-sm md:text-base opacity-90">
                        Kính chúc Quý khách An Khang Thịnh Vượng - Vạn Sự Như Ý
                    </p>
                </div>

                {/* Right Side: Icons */}
                <div className="flex items-center gap-4 text-4xl md:text-5xl animate-bounce-slow">
                    <span>🎋</span>
                    <span className="text-6xl md:text-7xl drop-shadow-xl transform hover:scale-110 transition-transform">
                        🐎
                    </span>
                    <span>🧧</span>
                </div>
            </div>
        </motion.div>
    );
};

export default TetBanner;
