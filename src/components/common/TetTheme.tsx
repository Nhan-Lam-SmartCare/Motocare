import React from "react";
import { createPortal } from "react-dom";

const TetTheme: React.FC = () => {
    // Variations of falling items
    const fallingItems = ["🌸", "🌼", "🧧", "💰", "✨", "🌸", "🌼"];

    // Generate random falling items
    const drops = [...Array(15)].map((_, i) => ({
        id: i,
        char: fallingItems[Math.floor(Math.random() * fallingItems.length)],
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 10 + Math.random() * 10,
        size: 1 + Math.random() * 1.5 // rem
    }));

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden font-sans">
            {/* --- Top Lantern Strings --- */}
            {/* Left Cluster */}
            <div className="absolute top-[-5px] left-4 md:left-12 flex flex-col items-center animate-sway origin-top z-50">
                {/* String */}
                <div className="h-6 w-[1px] bg-red-800/80"></div>
                {/* Lantern Body */}
                <div className="relative">
                    <div className="text-5xl md:text-7xl filter drop-shadow-[0_0_15px_rgba(220,38,38,0.6)] brightness-110 transform hover:scale-110 transition-transform cursor-pointer">
                        🏮
                    </div>
                    {/* Glow center */}
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                </div>
                {/* Tassel */}
                <div className="flex flex-col items-center mt-[-10px] space-y-[-2px]">
                    <div className="w-1 h-2 bg-red-700"></div>
                    <div className="text-red-600 text-2xl filter drop-shadow-sm">🧶</div>
                </div>
            </div>

            {/* Right Cluster - Slightly different height/delay */}
            <div className="absolute top-[-15px] right-4 md:right-12 flex flex-col items-center animate-sway origin-top delay-1000 z-50">
                <div className="h-10 w-[1px] bg-red-800/80"></div>
                <div className="relative">
                    <div className="text-6xl md:text-8xl filter drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] brightness-110">
                        🏮
                    </div>
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                </div>
                {/* Tassel */}
                <div className="flex flex-col items-center mt-[-12px] space-y-[-2px]">
                    <div className="w-1.5 h-3 bg-red-700"></div>
                    <div className="text-red-600 text-3xl filter drop-shadow-sm">🧶</div>
                </div>
            </div>

            {/* --- Decorative Corners (Blossom Branches) --- */}
            {/* Bottom Left - Mai Vàng (Apricot) */}
            <div className="absolute bottom-0 left-0 p-4 opacity-40 md:opacity-60 pointer-events-none transform -scale-x-100">
                <div className="text-6xl md:text-8xl transform rotate-12">🌼</div>
                <div className="absolute top-[-20px] right-[-30px] text-4xl transform -rotate-12">🌼</div>
                <div className="absolute top-[30px] right-[-40px] text-3xl">🌿</div>
            </div>

            {/* Bottom Right - Đào (Peach) */}
            <div className="absolute bottom-0 right-0 p-4 opacity-40 md:opacity-60 pointer-events-none">
                <div className="text-6xl md:text-8xl transform -rotate-12">🌸</div>
                <div className="absolute top-[-20px] left-[-30px] text-4xl transform rotate-12">🌸</div>
                <div className="absolute top-[30px] left-[-40px] text-3xl">🌱</div>
            </div>

            {/* --- Falling Items (Rain) --- */}
            {drops.map((drop) => (
                <div
                    key={drop.id}
                    className="absolute animate-fall"
                    style={{
                        left: `${drop.left}vw`,
                        fontSize: `${drop.size}rem`,
                        animationDelay: `${drop.delay}s`,
                        animationDuration: `${drop.duration}s`,
                        top: '-10vh', // Start above screen
                        opacity: 0
                    }}
                >
                    {drop.char}
                </div>
            ))}

            {/* --- Subtle Firecracker side decoration (Desktop only maybe?) --- */}
            <div className="hidden md:flex absolute top-20 left-2 flex-col gap-1 items-center animate-bounce-slow opacity-80">
                <div className="text-3xl">🧨</div>
                <div className="text-3xl">🧨</div>
                <div className="text-3xl">🧨</div>
            </div>

            <div className="hidden md:flex absolute top-20 right-2 flex-col gap-1 items-center animate-bounce-slow opacity-80 delay-1000">
                <div className="text-3xl">🧨</div>
                <div className="text-3xl">🧨</div>
                <div className="text-3xl">🧨</div>
            </div>

        </div>,
        document.body
    );
};

export default TetTheme;
