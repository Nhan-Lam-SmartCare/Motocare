import React from "react";
import { createPortal } from "react-dom";

const TetTheme: React.FC = () => {
    // Use Portal to render outside root layout to avoid z-index/overflow issues
    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Lanterns - Top Corners */}
            <div className="absolute top-0 left-4 md:left-10 text-4xl md:text-6xl animate-sway origin-top drop-shadow-lg">
                🏮
            </div>
            <div className="absolute top-0 right-4 md:right-10 text-4xl md:text-6xl animate-sway origin-top delay-700 drop-shadow-lg">
                🏮
            </div>

            {/* Falling Blossoms (Optimized count) */}
            {[...Array(8)].map((_, i) => (
                <div
                    key={i}
                    className="absolute text-xl md:text-2xl animate-fall opacity-0"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${10 + Math.random() * 10}s`,
                    }}
                >
                    {i % 2 === 0 ? "🌸" : "🌼"}
                </div>
            ))}
        </div>,
        document.body
    );
};

export default TetTheme;
