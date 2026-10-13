import { CSSProperties } from 'react';

type Shape = {
    left: string;
    top: string;
    size: number;
    duration: number;
    delay: number;
    kind: 'plus' | 'ring';
};

const defaultShapes: Shape[] = [
    { left: '58%', top: '9%', size: 30, duration: 11, delay: 0, kind: 'plus' },
    { left: '78%', top: '17%', size: 46, duration: 14, delay: 1.5, kind: 'plus' },
    { left: '90%', top: '6%', size: 18, duration: 9, delay: 3, kind: 'ring' },
    { left: '66%', top: '31%', size: 22, duration: 12, delay: 2, kind: 'ring' },
    { left: '8%', top: '44%', size: 26, duration: 13, delay: 4, kind: 'plus' },
    { left: '44%', top: '40%', size: 16, duration: 10, delay: 1, kind: 'plus' },
];

/** Soft drifting plus-signs and rings, purely decorative. */
export default function FloatingShapes({
    shapes = defaultShapes,
    className = '',
}: {
    shapes?: Shape[];
    className?: string;
}) {
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            {shapes.map((s, i) => {
                const style: CSSProperties = {
                    left: s.left,
                    top: s.top,
                    width: s.size,
                    height: s.size,
                    animationDuration: `${s.duration}s`,
                    animationDelay: `${s.delay}s`,
                };

                return s.kind === 'plus' ? (
                    <svg
                        key={i}
                        viewBox="0 0 24 24"
                        style={style}
                        className="absolute fill-jubilee-sky/25 motion-safe:animate-float-drift"
                    >
                        <path d="M9 2.5h6a1 1 0 0 1 1 1V8h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H16v4.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V16H3.5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1H8V3.5a1 1 0 0 1 1-1Z" />
                    </svg>
                ) : (
                    <span
                        key={i}
                        style={style}
                        className="absolute rounded-full border-2 border-jubilee-sky/30 motion-safe:animate-float-drift"
                    />
                );
            })}
        </div>
    );
}
