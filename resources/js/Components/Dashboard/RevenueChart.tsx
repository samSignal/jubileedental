import { formatMoney } from '@/Components/Dashboard/ui';
import { SeriesPoint } from '@/types/clinic';
import { PointerEvent, useId, useState } from 'react';

const W = 640;
const H = 300;
const PAD = { top: 16, right: 18, bottom: 34, left: 56 };

function niceMax(value: number): number {
    if (value <= 0) return 4;

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s * 4 >= value) ?? 10 * magnitude;

    return step * 4;
}

/** Responsive SVG line/area chart driven entirely by the points it is given. */
export default function RevenueChart({
    points,
    metric,
}: {
    points: SeriesPoint[];
    metric: 'revenue' | 'patients';
}) {
    const gradientId = useId();
    const [active, setActive] = useState<number | null>(null);

    const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
    const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
    const fmt = (v: number) => (metric === 'revenue' ? formatMoney(v) : String(Math.round(v)));
    const dense = points.length > 14;
    const labelEvery = dense ? Math.ceil(points.length / 7) : 1;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
    const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

    const onMove = (e: PointerEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const index = Math.round(((px - PAD.left) / innerW) * (points.length - 1));

        setActive(Math.max(0, Math.min(points.length - 1, index)));
    };

    const point = active === null ? null : points[active];
    const empty = points.every((p) => p.value === 0);

    return (
        <div className="relative w-full">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`${metric === 'revenue' ? 'Payments received' : 'Patients seen'} per day over ${points.length} days`}
                className="h-auto w-full touch-pan-y"
                onPointerMove={onMove}
                onPointerLeave={() => setActive(null)}
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2f8cff" stopOpacity="0.28" />
                        <stop offset="1" stopColor="#2f8cff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e6edf7" strokeDasharray="3 5" />
                        <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" className="fill-jubilee-muted text-[11px]">
                            {fmt(t)}
                        </text>
                    </g>
                ))}

                {points.map((p, i) =>
                    i % labelEvery === 0 || i === points.length - 1 ? (
                        <text
                            key={p.date}
                            x={x(i)}
                            y={H - 10}
                            textAnchor="middle"
                            className={`text-[11px] transition-colors ${active === i ? 'fill-jubilee-blue font-semibold' : 'fill-jubilee-muted'}`}
                        >
                            {p.label}
                        </text>
                    ) : null,
                )}

                {/* key on the range so the line redraws when the range changes */}
                <g key={points.length}>
                    <path d={area} fill={`url(#${gradientId})`} className="motion-safe:animate-fade-in" style={{ animationDelay: '0.6s' }} />
                    <path
                        d={line}
                        pathLength={1}
                        fill="none"
                        stroke="#1769e0"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="motion-safe:animate-draw"
                        style={{ strokeDasharray: 1 }}
                    />
                </g>

                {active !== null && (
                    <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="#1769e0" strokeOpacity={0.35} strokeDasharray="4 4" />
                )}

                {points.map((p, i) =>
                    !dense || active === i ? (
                        <circle
                            key={p.date}
                            cx={x(i)}
                            cy={y(p.value)}
                            r={active === i ? 7 : 4}
                            fill="#fff"
                            stroke="#1769e0"
                            strokeWidth={2.5}
                            className="transition-all duration-150"
                        />
                    ) : null,
                )}
            </svg>

            {empty && (
                <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-jubilee-muted">
                    {metric === 'revenue' ? 'No payments recorded in this period yet.' : 'No completed visits in this period yet.'}
                </p>
            )}

            {point && active !== null && (
                <div
                    role="status"
                    style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(point.value) / H) * 100}%` }}
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-xl bg-jubilee-ink px-3 py-2 text-xs text-white shadow-xl"
                >
                    <span className="block text-blue-200">{point.label}</span>
                    <span className="text-sm font-bold">
                        {metric === 'revenue' ? formatMoney(point.value, true) : `${Math.round(point.value)} patients`}
                    </span>
                </div>
            )}
        </div>
    );
}
