import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfettiProps {
    duration?: number; // Duration in milliseconds
    count?: number; // Number of confetti pieces
}

const TetConfetti: React.FC<ConfettiProps> = ({ duration = 5000, count = 50 }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; color: string; size: number; type: string }[]>([]);

    useEffect(() => {
        // Generate confetti pieces on mount
        const newPieces = Array.from({ length: count }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            color: ['#DC2626', '#FBBF24', '#F97316', '#EF4444', '#FDE047'][Math.floor(Math.random() * 5)],
            size: Math.random() * 10 + 5,
            type: ['🧧', '🌸', '🌼', '✨', '🎊', '🏮'][Math.floor(Math.random() * 6)],
        }));
        setPieces(newPieces);

        // Hide after duration
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, duration);

        return () => clearTimeout(timer);
    }, [count, duration]);

    if (!isVisible) return null;

    return createPortal(
        <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute text-2xl animate-confetti-fall"
                    style={{
                        left: `${piece.left}%`,
                        animationDelay: `${piece.delay}s`,
                        fontSize: `${piece.size}px`,
                    }}
                >
                    {piece.type}
                </div>
            ))}
        </div>,
        document.body
    );
};

export default TetConfetti;
