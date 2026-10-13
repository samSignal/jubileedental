import {
    BellIcon,
    BellRingIcon,
    CalendarIcon,
    CardIcon,
    FileTextIcon,
    UsersGroupIcon,
} from '@/Components/Dashboard/DashboardIcons';
import { relativeTime, toneTile } from '@/Components/Dashboard/ui';
import { ActivityItem } from '@/types/clinic';
import { router } from '@inertiajs/react';
import { ComponentType, SVGAttributes, useEffect, useRef, useState } from 'react';

export type ServerNotification = {
    id: string;
    title: string;
    body: string;
    patient_id: number | null;
    appointment_id: number | null;
    queue_number: number | null;
    alerts: string[];
    intake_overridden: boolean;
    consent_pending?: boolean;
    history_status?: 'ok' | 'missing' | 'outdated';
    read: boolean;
    at: string;
};

const icons: Record<string, ComponentType<SVGAttributes<SVGElement>>> = {
    card: CardIcon,
    calendar: CalendarIcon,
    file: FileTextIcon,
    patients: UsersGroupIcon,
    bell: BellRingIcon,
};

/**
 * The bell. "For you" holds real notifications addressed to this person (such as
 * a patient being ready); "Clinic activity" is the shared feed of recent events.
 */
export default function NotificationsMenu({
    notifications,
    activity,
}: {
    notifications: { unread: number; items: ServerNotification[] } | null;
    activity: ActivityItem[];
}) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState<Set<string>>(new Set());
    const root = useRef<HTMLDivElement>(null);

    const unread = notifications?.unread ?? 0;
    const items = notifications?.items ?? [];

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const toggle = () => {
        if (!open) {
            // Keep today's unread items highlighted while the list is open, then mark them read.
            setHighlight(new Set(items.filter((n) => !n.read).map((n) => n.id)));

            if (unread > 0) {
                router.post(route('notifications.read'), {}, {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['notifications'],
                });
            }
        }

        setOpen((value) => !value);
    };

    const openItem = (n: ServerNotification) => {
        setOpen(false);

        if (n.patient_id) {
            router.visit(route('patients.show', n.patient_id));
        }
    };

    return (
        <div ref={root} className="relative">
            <button
                type="button"
                onClick={toggle}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
                className="relative grid h-11 w-11 place-items-center rounded-xl text-jubilee-ink transition hover:bg-blue-50"
            >
                <BellIcon className={`h-6 w-6 ${unread > 0 ? 'motion-safe:animate-bob' : ''}`} />
                {unread > 0 && (
                    <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold text-white ring-2 ring-white motion-safe:animate-pop-in">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-16px_rgba(11,42,111,0.4)] ring-1 ring-[#e6edf7] motion-safe:animate-pop-in">
                    <div className="max-h-[28rem] overflow-y-auto">
                        <p className="border-b border-[#eef3fa] px-4 py-3 font-display text-base font-bold">For you</p>
                        {items.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-jubilee-muted">
                                You are all caught up. Messages such as &ldquo;patient ready&rdquo; arrive here.
                            </p>
                        ) : (
                            <ul className="p-1.5">
                                {items.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            type="button"
                                            onClick={() => openItem(n)}
                                            className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-blue-50/60 ${
                                                highlight.has(n.id) ? 'bg-blue-50/70' : ''
                                            }`}
                                        >
                                            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-jubilee-navy text-xs font-extrabold text-white">
                                                {n.queue_number !== null ? `Q${n.queue_number}` : '•'}
                                            </span>
                                            <span className="min-w-0 flex-1 leading-tight">
                                                <span className="block truncate text-sm font-semibold">{n.title}</span>
                                                <span className="block truncate text-xs text-jubilee-muted">
                                                    {n.body} · {relativeTime(n.at)}
                                                </span>
                                                {(n.alerts.length > 0 || n.consent_pending || (n.history_status && n.history_status !== 'ok')) && (
                                                    <span className="mt-1 flex flex-wrap gap-1">
                                                        {n.alerts.map((a) => (
                                                            <span key={a} className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700">
                                                                {a}
                                                            </span>
                                                        ))}
                                                        {n.consent_pending && (
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                                                Consent pending
                                                            </span>
                                                        )}
                                                        {n.history_status && n.history_status !== 'ok' && (
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                                                {n.history_status === 'missing' ? 'No medical history' : 'History review due'}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <p className="border-y border-[#eef3fa] px-4 py-3 font-display text-base font-bold">Clinic activity</p>
                        {activity.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-jubilee-muted">Nothing has happened yet.</p>
                        ) : (
                            <ul className="p-1.5">
                                {activity.slice(0, 6).map((n) => {
                                    const Icon = icons[n.icon] ?? BellRingIcon;

                                    return (
                                        <li key={n.key} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneTile[n.tone]}`}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1 leading-tight">
                                                <span className="block truncate text-sm font-semibold">{n.title}</span>
                                                <span className="block truncate text-xs text-jubilee-muted">
                                                    {n.meta} · {relativeTime(n.at)}
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
