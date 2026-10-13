import { useId } from 'react';

/** Tiny trend line for stat cards. Purely visual; the number beside it is the data. */
export default function Sparkline({
    data,
    color = '#1769e0',
    className = '',
}: {
    data: number[];
    color?: string;
    className?: string;
}) {
    const id = useId();

    if (data.length < 2) {
        return null;
    }

    const W = 120;
    const H = 36;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    const x = (i: number) => (i / (data.length - 1)) * W;
    const y = (v: number) => H - 4 - ((v - min) / span) * (H - 10);
    const flat = max === min;

    const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${(flat ? H - 6 : y(v)).toFixed(1)}`).join(' ');
    const lastY = flat ? H - 6 : y(data[data.length - 1]);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className={`h-9 w-full overflow-visible ${className}`}
        >
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity="0.22" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`${line} L${W},${H} L0,${H} Z`}
                fill={`url(#${id})`}
                className="motion-safe:animate-fade-in"
            />
            <path
                d={line}
                pathLength={1}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="motion-safe:animate-draw"
                style={{ strokeDasharray: 1 }}
            />
            <circle cx={W} cy={lastY} r={3} fill="#fff" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
