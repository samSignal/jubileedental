import { cardClass } from '@/Components/Dashboard/ui';
import { AppointmentStatus, TimelineItem } from '@/types/clinic';
import { useEffect, useMemo, useState } from 'react';

const blockStyle: Record<AppointmentStatus, string> = {
    scheduled: 'border-violet-300 bg-violet-100 text-violet-800',
    waiting: 'border-amber-300 bg-amber-100 text-amber-800',
    in_progress: 'border-jubilee-blue bg-jubilee-blue text-white shadow-[0_8px_18px_-8px_rgba(23,105,224,0.8)]',
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-800',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-400 line-through',
    no_show: 'border-slate-200 bg-slate-100 text-slate-400 line-through',
};

const legend: { label: string; dot: string }[] = [
    { label: 'Scheduled', dot: 'bg-violet-400' },
    { label: 'Waiting', dot: 'bg-amber-400' },
    { label: 'In treatment', dot: 'bg-jubilee-blue' },
    { label: 'Done', dot: 'bg-emerald-500' },
];

const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

function hourLabel(h: number): string {
    const suffix = h >= 12 ? 'pm' : 'am';

    return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

/**
 * Today's appointments laid out across the working day, with a moving "now"
 * marker. Overlapping visits stack into lanes. Built only from real bookings.
 */
export default function DayTimeline({ items }: { items: TimelineItem[] }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);

        return () => window.clearInterval(id);
    }, []);

    const layout = useMemo(() => {
        const visible = items.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show');
        const blocks = visible
            .map((a) => {
                const start = hourOf(new Date(a.scheduled_at));

                return { a, start, end: start + Math.max(15, a.duration_minutes) / 60 };
            })
            .sort((x, y) => x.start - y.start);

        // Zoom to where today's visits actually are (and "now"), at least 6 hours wide.
        const current = hourOf(new Date());
        const starts = blocks.map((b) => b.start);
        const ends = blocks.map((b) => b.end);
        let from = starts.length ? Math.max(0, Math.floor(Math.min(...starts, current) - 0.5)) : 8;
        let to = ends.length ? Math.min(24, Math.ceil(Math.max(...ends, current) + 0.5)) : 17;

        if (to - from < 6) {
            to = Math.min(24, from + 6);
            from = Math.max(0, to - 6);
        }
        const laneEnds: number[] = [];

        const placed = blocks.map((b) => {
            let lane = laneEnds.findIndex((end) => end <= b.start + 0.001);
            if (lane === -1) {
                lane = laneEnds.length;
            }
            laneEnds[lane] = b.end;

            return { ...b, lane };
        });

        return { placed, from, to, lanes: Math.max(1, laneEnds.length) };
    }, [items]);

    const { placed, from, to, lanes } = layout;
    const span = to - from;
    const pct = (h: number) => ((h - from) / span) * 100;
    const nowHour = hourOf(now);
    const showNow = nowHour >= from && nowHour <= to;
    const step = span > 12 ? 2 : 1;
    const hours = Array.from({ length: span + 1 }, (_, i) => from + i).filter((h, i) => i % step === 0);

    return (
        <section
            aria-label="Today's timeline"
            style={{ animationDelay: '200ms' }}
            className={`${cardClass} p-5 sm:p-6 motion-safe:animate-fade-up`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold tracking-tight">Today&apos;s Timeline</h2>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-jubilee-muted">
                    {legend.map((l) => (
                        <li key={l.label} className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                            {l.label}
                        </li>
                    ))}
                </ul>
            </div>

            {placed.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-[#cfdcf0] px-4 py-6 text-center text-sm text-jubilee-muted">
                    Nothing is booked for today yet.
                </p>
            ) : (
                <div className="mt-5 overflow-x-auto px-6 pb-1">
                    <div className="relative min-w-[560px]" style={{ height: lanes * 42 + 30 }}>
                        {/* hour grid */}
                        {hours.map((h) => (
                            <div
                                key={h}
                                className="absolute top-0 bottom-6 border-l border-dashed border-[#e3ebf6]"
                                style={{ left: `${pct(h)}%` }}
                            >
                                <span className="absolute -bottom-6 -translate-x-1/2 text-[0.68rem] font-medium text-jubilee-hint">
                                    {hourLabel(h)}
                                </span>
                            </div>
                        ))}

                        {/* appointment blocks */}
                        {placed.map(({ a, start, end, lane }) => (
                            <div
                                key={a.id}
                                title={`${a.time} · ${a.patient} · ${a.procedure} · ${a.status_label}`}
                                style={{
                                    left: `${pct(start)}%`,
                                    width: `calc(${((end - start) / span) * 100}% - 4px)`,
                                    top: lane * 42,
                                    minWidth: 54,
                                }}
                                className={`absolute flex h-9 items-center overflow-hidden rounded-lg border px-2 text-[0.7rem] font-semibold transition-transform duration-200 hover:z-20 hover:-translate-y-0.5 ${blockStyle[a.status]}`}
                            >
                                <span className="truncate">{a.patient.split(' ')[0]}</span>
                            </div>
                        ))}

                        {/* now marker */}
                        {showNow && (
                            <div
                                className="pointer-events-none absolute top-0 bottom-6 z-30 w-px bg-rose-500"
                                style={{ left: `${pct(nowHour)}%` }}
                            >
                                <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-rose-500 ring-4 ring-rose-500/20 motion-safe:animate-pulse" />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-rose-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                                    {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
