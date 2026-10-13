import { CalendarIcon } from '@/Components/Dashboard/DashboardIcons';
import { AnimatedNumber, Avatar, cardClass } from '@/Components/Dashboard/ui';
import { AppointmentStatus, Queue, TimelineItem } from '@/types/clinic';
import { useToast } from '@/Layouts/DashboardLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const statusStyle: Record<AppointmentStatus, { pill: string; dot: string }> = {
    scheduled: { pill: 'bg-violet-50 text-violet-600', dot: 'bg-violet-400' },
    waiting: { pill: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
    in_progress: { pill: 'bg-blue-50 text-jubilee-blue', dot: 'bg-jubilee-blue' },
    completed: { pill: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    cancelled: { pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
    no_show: { pill: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
};

const REFRESH = ['timeline', 'queue', 'stats', 'activity', 'recentPatients', 'followUps', 'series', 'flash', 'notifications'];

function QueueChip({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: string;
}) {
    return (
        <span className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${tone}`}>
            <AnimatedNumber value={value} className="text-base font-extrabold" />
            {label}
        </span>
    );
}

/**
 * Today's schedule as a live queue. Overdue and long-waiting patients are
 * highlighted; row actions appear on hover or focus (always on touch screens).
 */
export default function AppointmentTimeline({
    items,
    queue,
    variant = 'rail',
    onBook,
    onFinish,
}: {
    items: TimelineItem[];
    queue: Queue;
    variant?: 'rail' | 'main';
    onBook?: () => void;
    /** When given, "Complete" opens the record-services panel instead of closing the visit directly. */
    onFinish?: (item: TimelineItem) => void;
}) {
    const [busy, setBusy] = useState<number | null>(null);
    const toast = useToast();

    const move = (id: number, status: AppointmentStatus) => {
        setBusy(id);
        router.patch(
            route('appointments.status', id),
            { status },
            {
                preserveScroll: true,
                only: REFRESH,
                onError: (errors) => toast(errors.intake ?? errors.status ?? 'That could not be done.'),
                onFinish: () => setBusy(null),
            },
        );
    };

    return (
        <section
            id="queue"
            aria-label="Today's appointments"
            className={`${cardClass} scroll-mt-28 p-5 sm:p-6 motion-safe:animate-fade-up`}
            style={{ animationDelay: '250ms' }}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold tracking-tight">
                    Today&apos;s Queue
                </h2>
                {queue.next && variant === 'main' && (
                    <p className="hidden text-xs text-jubilee-muted sm:block">
                        Next up:{' '}
                        <span className="font-semibold text-jubilee-ink">
                            {queue.next.patient}
                        </span>{' '}
                        · {queue.next.time}
                    </p>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <QueueChip label="Waiting" value={queue.waiting} tone="bg-amber-50 text-amber-700" />
                <QueueChip label="In treatment" value={queue.in_treatment} tone="bg-blue-50 text-jubilee-blue" />
                {queue.overdue > 0 && (
                    <QueueChip label="Running late" value={queue.overdue} tone="bg-rose-50 text-rose-600" />
                )}
            </div>

            {queue.next && variant === 'rail' && (
                <p className="mt-3 text-xs text-jubilee-muted">
                    Next up:{' '}
                    <span className="font-semibold text-jubilee-ink">{queue.next.patient}</span> · {queue.next.time}
                </p>
            )}

            {items.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cfdcf0] px-4 py-8 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-jubilee-blue">
                        <CalendarIcon className="h-6 w-6" />
                    </span>
                    <p className="text-sm text-jubilee-muted">
                        No appointments scheduled for today.
                    </p>
                    {onBook && (
                        <button
                            type="button"
                            onClick={onBook}
                            className="rounded-xl bg-jubilee-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1259c4]"
                        >
                            Book an appointment
                        </button>
                    )}
                </div>
            ) : (
                <ul className={`mt-4 space-y-2 ${variant === 'rail' ? 'max-h-[34rem] overflow-y-auto pr-1' : ''}`}>
                    {items.map((a) => {
                        const style = statusStyle[a.status];
                        const longWait = (a.waiting_minutes ?? 0) >= 20;
                        const alert = a.is_overdue || longWait;

                        return (
                            <li
                                key={a.id}
                                className={`group rounded-2xl border transition-colors ${
                                    alert
                                        ? 'border-amber-200 bg-amber-50/50'
                                        : 'border-[#eef3fa] bg-white hover:border-jubilee-sky/40 hover:bg-blue-50/30'
                                } ${a.status === 'completed' ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-center gap-3 px-3 py-3">
                                    <span className="w-[3.6rem] shrink-0 text-xs font-medium leading-tight text-jubilee-muted">
                                        {a.time}
                                        {a.queue_label && (
                                            <span className="mt-1 block w-fit rounded-md bg-jubilee-navy px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                                                {a.queue_label}
                                            </span>
                                        )}
                                    </span>
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot} ${a.status === 'in_progress' ? 'motion-safe:animate-pulse' : ''}`} />
                                    <Avatar name={a.patient} size={34} className={variant === 'rail' ? 'hidden' : ''} />
                                    <span className="min-w-0 flex-1 leading-tight">
                                        <span className="block truncate text-sm font-semibold">{a.patient}</span>
                                        <span className="block truncate text-xs text-jubilee-muted">
                                            {a.procedure}
                                            {a.dentist ? ` · ${a.dentist}` : ''}
                                            {a.is_walk_in ? ' · Walk-in' : ''}
                                        </span>
                                        {(a.alerts.length > 0 || a.consent_pending || a.history_status !== 'ok') && (
                                            <span className="mt-1 flex flex-wrap gap-1">
                                                {a.alerts.map((al) => (
                                                    <span key={al} className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700">
                                                        {al}
                                                    </span>
                                                ))}
                                                {a.consent_pending && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800">
                                                        Consent pending
                                                    </span>
                                                )}
                                                {a.history_status === 'missing' && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                                        No medical history: review
                                                    </span>
                                                )}
                                                {a.history_status === 'outdated' && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                                        History over a year old: review
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        {variant === 'rail' && (
                                            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${style.pill}`}>
                                                {a.status_label}
                                            </span>
                                        )}
                                        {a.is_overdue && (
                                            <span className="mt-0.5 block text-xs font-semibold text-amber-600">
                                                {a.late_minutes} min late
                                            </span>
                                        )}
                                        {a.waiting_minutes !== null && (
                                            <span className={`mt-0.5 block text-xs font-semibold ${longWait ? 'text-rose-600' : 'text-amber-600'}`}>
                                                Waiting {a.waiting_minutes} min
                                            </span>
                                        )}
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${style.pill} ${variant === 'rail' ? 'hidden' : ''}`}>
                                        {a.status_label}
                                    </span>
                                </div>

                                {a.actions.length > 0 && (
                                    <div className="grid grid-rows-[0fr] transition-all duration-300 group-focus-within:grid-rows-[1fr] group-hover:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
                                        <div className="overflow-hidden">
                                            <div className="flex flex-wrap gap-2 px-3 pb-3 pl-[3.6rem]">
                                                {a.actions.map((action, i) => {
                                                    const primary = i === 0;

                                                    return (
                                                        <button
                                                            key={action.status}
                                                            type="button"
                                                            disabled={busy === a.id}
                                                            onClick={() =>
                                                                action.status === 'completed' && onFinish
                                                                    ? onFinish(a)
                                                                    : move(a.id, action.status)
                                                            }
                                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/20 disabled:opacity-60 ${
                                                                primary
                                                                    ? 'bg-jubilee-blue text-white hover:bg-[#1259c4]'
                                                                    : 'bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50'
                                                            }`}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
