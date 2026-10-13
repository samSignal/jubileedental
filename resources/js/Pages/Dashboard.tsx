import ApplicationLogo from '@/Components/ApplicationLogo';
import AppointmentTimeline from '@/Components/Dashboard/AppointmentTimeline';
import CompleteVisitPanel from '@/Components/Dashboard/CompleteVisitPanel';
import DayTimeline from '@/Components/Dashboard/DayTimeline';
import {
    ArrowRightIcon,
    AlertTriangleIcon,
    ArrowUpIcon,
    BarsIcon,
    BellRingIcon,
    CalendarIcon,
    CardIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ClipboardIcon,
    ClockIcon,
    FileTextIcon,
    PillIcon,
    ReceiptIcon,
    UserPlusIcon,
    UsersGroupIcon,
} from '@/Components/Dashboard/DashboardIcons';
import {
    AddInvoiceForm,
    BookAppointmentForm,
    NewPatientForm,
    PrescriptionForm,
    RecordPaymentForm,
} from '@/Components/Dashboard/Forms';
import RevenueChart from '@/Components/Dashboard/RevenueChart';
import SlideOver from '@/Components/Dashboard/SlideOver';
import Sparkline from '@/Components/Dashboard/Sparkline';
import {
    AnimatedNumber,
    Avatar,
    cardClass,
    formatMoney,
    greetingFor,
    relativeTime,
    toneStroke,
    toneTile,
} from '@/Components/Dashboard/ui';
import DashboardLayout, { useComingSoon } from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import {
    ActivityItem,
    FollowUp,
    Options,
    Outstanding,
    PanelKey,
    ServiceItem,
    Permissions,
    Queue,
    RecentPatient,
    Series,
    Stat,
    TimelineItem,
    Tone,
} from '@/types/clinic';
import { Head, router, usePoll } from '@inertiajs/react';
import {
    ComponentType,
    CSSProperties,
    ReactNode,
    SVGAttributes,
    useCallback,
    useEffect,
    useState,
} from 'react';

type Icon = ComponentType<SVGAttributes<SVGElement>>;

type Props = PageProps<{
    role: string | null;
    view: 'clinician' | 'frontdesk' | 'admin';
    roleLabel: string;
    range: number;
    can: Permissions;
    hasDemoRecords: boolean;
    stats: Stat[];
    queue: Queue;
    timeline: TimelineItem[];
    series: Series;
    recentPatients: RecentPatient[];
    followUps: FollowUp[];
    activity: ActivityItem[];
    outstanding: Outstanding;
    options: Options & { services?: ServiceItem[] };
}>;

/** Props refreshed by the live poll. Static or heavy props (options) are skipped. */
const LIVE = [
    'stats',
    'queue',
    'timeline',
    'series',
    'recentPatients',
    'followUps',
    'activity',
    'outstanding',
];

const statIcons: Record<string, Icon> = {
    patients: UsersGroupIcon,
    calendar: CalendarIcon,
    invoice: ReceiptIcon,
    prescription: FileTextIcon,
};

const noticeIcons: Record<string, Icon> = {
    card: CardIcon,
    calendar: CalendarIcon,
    file: FileTextIcon,
    patients: UsersGroupIcon,
    bell: BellRingIcon,
};

const wellness = [
    "Confirm tomorrow's appointments before closing the day.",
    'Healthy smiles start with a warm welcome.',
    'A minute of flossing saves a filling. Remind your patients.',
    'Check that every treatment today has an invoice.',
];

const rise = 'motion-safe:animate-fade-up';
const at = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function SectionHeader({
    title,
    action = 'View All',
    onAction,
}: {
    title: string;
    action?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="group flex items-center gap-1 text-sm font-medium text-jubilee-blue"
                >
                    {action}
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            )}
        </div>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return (
        <p className="mt-3 rounded-xl border border-dashed border-[#cfdcf0] px-4 py-6 text-center text-sm text-jubilee-muted">
            {children}
        </p>
    );
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
    const Icon = statIcons[stat.icon] ?? UsersGroupIcon;
    const up = stat.trend?.direction === 'up';
    const down = stat.trend?.direction === 'down';

    return (
        <div
            style={at(150 + index * 90)}
            className={`${cardClass} ${rise} group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-20px_rgba(23,105,224,0.35)]`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110 ${toneTile[stat.tone]}`}
                >
                    <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                    <p className="text-[0.8rem] leading-tight text-jubilee-muted">{stat.label}</p>
                    <p className="mt-1 font-display text-[1.7rem] font-extrabold tracking-tight sm:text-3xl">
                        <AnimatedNumber value={stat.value} format={stat.format} />
                    </p>
                </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <p className="min-w-0 text-sm">
                    {stat.trend ? (
                        <span className="flex flex-wrap items-center gap-x-1.5">
                            <span
                                className={`flex items-center gap-0.5 font-semibold ${
                                    down ? 'text-rose-600' : up ? 'text-emerald-600' : 'text-jubilee-muted'
                                }`}
                            >
                                {stat.trend.direction !== 'flat' && (
                                    <ArrowUpIcon className={`h-4 w-4 ${down ? 'rotate-180' : ''}`} />
                                )}
                                {stat.trend.pct}%
                            </span>
                            <span className="text-jubilee-muted">{stat.trend.label}</span>
                        </span>
                    ) : (
                        <span className="text-jubilee-muted">{stat.hint ?? 'Updated live'}</span>
                    )}
                </p>
                {stat.spark && stat.spark.some((v) => v > 0) && (
                    <div className="w-20 shrink-0">
                        <Sparkline data={stat.spark} color={toneStroke[stat.tone]} />
                    </div>
                )}
            </div>
        </div>
    );
}

function LiveClock({ updatedAt }: { updatedAt: Date }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="text-left sm:text-right">
            <p className="flex items-center gap-2 text-sm font-medium sm:justify-end">
                <CalendarIcon className="h-5 w-5 text-jubilee-muted" />
                {now.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-jubilee-muted sm:justify-end">
                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live · {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            </p>
        </div>
    );
}

function WellnessCard() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const id = window.setInterval(() => setIndex((i) => (i + 1) % wellness.length), 9000);

        return () => window.clearInterval(id);
    }, []);

    return (
        <section
            style={at(420)}
            className={`${rise} relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#dfeeff] via-[#cfe4ff] to-[#b8d6ff] p-6 ring-1 ring-white`}
        >
            <span className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/50 blur-2xl motion-safe:animate-drift" />
            <div className="absolute -bottom-3 right-3 h-24 w-24 motion-safe:animate-bob">
                <ApplicationLogo shine className="h-full w-full" />
            </div>
            <p className="relative font-display text-lg font-extrabold leading-snug tracking-tight">
                Healthy Smiles
                <br />
                <span className="text-jubilee-blue">Brighter Lives</span>
            </p>
            <p
                key={index}
                aria-live="polite"
                className="relative mt-3 min-h-[3.5rem] max-w-[13rem] text-sm text-jubilee-muted motion-safe:animate-fade-in"
            >
                {wellness[index]}
            </p>
        </section>
    );
}

function OutstandingCard({
    outstanding,
    canCollect,
    onCollect,
    className = '',
}: {
    outstanding: Outstanding;
    canCollect: boolean;
    onCollect: (invoiceId: number) => void;
    className?: string;
}) {
    return (
        <section style={at(330)} className={`${cardClass} ${rise} p-5 sm:p-6 ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-lg font-bold tracking-tight">Outstanding Invoices</h2>
                    <p className="text-sm text-jubilee-muted">
                        {outstanding.count === 0
                            ? 'Everything is settled'
                            : `${outstanding.count} unpaid · ${formatMoney(outstanding.total, true)} owed`}
                    </p>
                </div>
            </div>

            {outstanding.invoices.length === 0 ? (
                <Empty>No unpaid invoices. Nicely done.</Empty>
            ) : (
                <ul className="mt-3">
                    {outstanding.invoices.slice(0, 5).map((i) => (
                        <li key={i.id} className="flex items-center gap-3 border-t border-[#eef3fa] py-3 first:border-t-0">
                            <Avatar name={i.patient} size={36} />
                            <span className="min-w-0 flex-1 leading-tight">
                                <span className="block truncate text-sm font-semibold">{i.patient}</span>
                                <span className="block truncate text-xs text-jubilee-muted">
                                    {i.number} · {i.description} · {i.issued}
                                </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums">{formatMoney(i.balance, true)}</span>
                            {canCollect && (
                                <button
                                    type="button"
                                    onClick={() => onCollect(i.id)}
                                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                    Collect
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function Dashboard({
    auth,
    view,
    roleLabel,
    range,
    can,
    hasDemoRecords,
    stats,
    queue,
    timeline,
    series,
    recentPatients,
    followUps,
    activity,
    outstanding,
    options,
}: Props) {
    const soon = useComingSoon();
    const [panel, setPanel] = useState<PanelKey | null>(null);
    const [invoiceId, setInvoiceId] = useState<number | undefined>();
    const [prefillPatient, setPrefillPatient] = useState<number | undefined>();
    const [updatedAt, setUpdatedAt] = useState(() => new Date());
    const [finishing, setFinishing] = useState<TimelineItem | null>(null);

    // Live refresh: pulls fresh figures every 30s while the tab is visible.
    usePoll(30_000, { only: LIVE, onFinish: () => setUpdatedAt(new Date()) });

    const open = useCallback((key: PanelKey, invoice?: number, patient?: number) => {
        setInvoiceId(invoice);
        setPrefillPatient(patient);
        setPanel(key);
    }, []);

    // The command palette (in the layout) asks us to open panels.
    useEffect(() => {
        const onOpen = (e: Event) => {
            const detail = (e as CustomEvent<{ panel: PanelKey; patientId?: number }>).detail;
            open(detail.panel, undefined, detail.patientId);
        };
        window.addEventListener('jubilee:open-panel', onOpen);

        return () => window.removeEventListener('jubilee:open-panel', onOpen);
    }, [open]);
    const close = useCallback(() => setPanel(null), []);

    const changeRange = (days: number) => {
        router.get(
            window.location.pathname,
            { range: days },
            { preserveState: true, preserveScroll: true, replace: true, only: ['series', 'range'] },
        );
    };

    const first = auth.user.name.split(' ')[0];
    const name =
        view === 'clinician' && !/^(dr\.?|dentist)$/i.test(first) ? `Dr. ${first}` : first;

    const frontDesk = view === 'frontdesk';
    const timelineInMain = view !== 'admin';
    const showChart = can.seesRevenue || view === 'clinician';

    const tiles: { label: string; Icon: Icon; tone: Tone; onClick: () => void }[] = [];
    if (auth.user.permissions.includes('appointments.queue'))
        tiles.push({ label: 'Front Desk', Icon: ClipboardIcon, tone: 'blue', onClick: () => router.visit(route('frontdesk.index')) });
    if (can.recordPayment) tiles.push({ label: 'Record Payment', Icon: CardIcon, tone: 'green', onClick: () => open('payment') });
    if (can.bookAppointment) tiles.push({ label: 'Book Appointment', Icon: CalendarIcon, tone: 'teal', onClick: () => open('appointment') });
    if (can.createPatient) tiles.push({ label: 'New Patient', Icon: UserPlusIcon, tone: 'blue', onClick: () => open('patient') });
    if (can.addInvoice) tiles.push({ label: 'Add Invoice', Icon: FileTextIcon, tone: 'violet', onClick: () => open('invoice') });
    if (can.prescribe) tiles.push({ label: 'Create Prescription', Icon: PillIcon, tone: 'rose', onClick: () => open('prescription') });
    tiles.push({ label: 'View Calendar', Icon: CalendarIcon, tone: 'slate', onClick: () => soon('Calendar') });
    tiles.push({ label: 'Generate Report', Icon: BarsIcon, tone: 'slate', onClick: () => soon('Reports') });
    const quickTiles = tiles.slice(0, 6);

    const change =
        series.previous_total > 0
            ? Math.round(((series.total - series.previous_total) / series.previous_total) * 100)
            : null;

    // One plain-language sentence about what needs attention right now.
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    type Insight = {
        tone: 'amber' | 'rose' | 'blue' | 'green';
        Icon: Icon;
        text: string;
        action?: { label: string; run: () => void };
    };
    const insight: Insight = (() => {
        const scrollToQueue = () =>
            document.getElementById('queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (queue.waiting > 0 && (queue.longest_wait ?? 0) >= 15) {
            return {
                tone: 'amber',
                Icon: ClockIcon,
                text: `${plural(queue.waiting, 'patient')} waiting. The longest has been here ${queue.longest_wait} min.`,
                action: { label: 'Open queue', run: scrollToQueue },
            };
        }
        if (queue.overdue > 0) {
            return {
                tone: 'rose',
                Icon: AlertTriangleIcon,
                text: `${plural(queue.overdue, 'appointment')} running late and not checked in yet.`,
                action: { label: 'Open queue', run: scrollToQueue },
            };
        }
        if (can.seesRevenue && outstanding.count > 0) {
            return {
                tone: 'blue',
                Icon: ReceiptIcon,
                text: `${plural(outstanding.count, 'invoice')} unpaid, ${formatMoney(outstanding.total, true)} owed.`,
                action: can.recordPayment ? { label: 'Collect payment', run: () => open('payment') } : undefined,
            };
        }
        if (timeline.length === 0) {
            return {
                tone: 'blue',
                Icon: CalendarIcon,
                text: 'No appointments are booked for today yet.',
                action: can.bookAppointment ? { label: 'Book one', run: () => open('appointment') } : undefined,
            };
        }

        return { tone: 'green', Icon: CheckCircleIcon, text: 'All clear. Nothing needs your attention right now.' };
    })();

    const insightTone: Record<Insight['tone'], string> = {
        amber: 'bg-amber-50 text-amber-900 ring-amber-200',
        rose: 'bg-rose-50 text-rose-900 ring-rose-200',
        blue: 'bg-blue-50 text-jubilee-ink ring-blue-200',
        green: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
    };

    const chartCard = showChart && (
        <section style={at(450)} className={`${cardClass} ${rise} flex min-w-0 flex-col p-5 sm:p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-lg font-bold tracking-tight">{series.title}</h2>
                    <p className="text-sm text-jubilee-muted">
                        <span className="font-semibold text-jubilee-ink">
                            {series.metric === 'revenue'
                                ? formatMoney(series.total, true)
                                : `${Math.round(series.total)} patients`}
                        </span>{' '}
                        in the last {range} days
                        {change !== null && (
                            <span className={`ml-2 font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
                            </span>
                        )}
                    </p>
                </div>
                <div role="group" aria-label="Date range" className="flex rounded-xl bg-[#f2f6fc] p-1">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            type="button"
                            aria-pressed={range === d}
                            onClick={() => changeRange(d)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                range === d ? 'bg-white text-jubilee-blue shadow-sm' : 'text-jubilee-muted hover:text-jubilee-ink'
                            }`}
                        >
                            {d}D
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-4 flex flex-1 items-center">
                <RevenueChart points={series.points} metric={series.metric} />
            </div>
        </section>
    );

    const quickCard = (
        <section style={at(520)} className={`${cardClass} ${rise} p-5 sm:p-6`}>
            <SectionHeader title="Quick Actions" />
            <div className="mt-4 grid grid-cols-2 gap-3">
                {quickTiles.map(({ label, Icon, tone, onClick }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={onClick}
                        className="group flex flex-col items-start gap-2.5 rounded-2xl border border-[#e6edf7] bg-white p-3.5 text-left text-[0.8rem] font-medium leading-tight transition-all duration-200 hover:-translate-y-1 hover:border-jubilee-sky/50 hover:shadow-[0_16px_28px_-16px_rgba(23,105,224,0.4)] focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/20"
                    >
                        <span
                            className={`grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${toneTile[tone]}`}
                        >
                            <Icon className="h-6 w-6" />
                        </span>
                        {label}
                    </button>
                ))}
            </div>
        </section>
    );

    const timelineCard = (variant: 'main' | 'rail') => (
        <AppointmentTimeline
            items={timeline}
            queue={queue}
            variant={variant}
            onBook={can.bookAppointment ? () => open('appointment') : undefined}
            onFinish={auth.user.permissions.includes('appointments.treat') ? setFinishing : undefined}
        />
    );

    const outstandingCard = (className = '') =>
        can.seesRevenue && (
            <OutstandingCard
                outstanding={outstanding}
                canCollect={can.recordPayment}
                onCollect={(id) => open('payment', id)}
                className={className}
            />
        );

    return (
        <>
            <Head title={`${roleLabel} Dashboard`} />

            <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
                {/* Main column */}
                <div className="min-w-0 space-y-6">
                    <section
                        className={`${rise} relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#eef5ff] to-[#d9e9ff] p-5 ring-1 ring-white sm:p-7`}
                    >
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-jubilee-sky/25 blur-3xl motion-safe:animate-drift"
                        />
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-24 left-1/4 h-60 w-60 rounded-full bg-blue-300/20 blur-3xl motion-safe:animate-drift-slow"
                        />

                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h1 className="font-display text-[1.65rem] font-extrabold tracking-tight sm:text-3xl">
                                    {greetingFor(new Date())}, {name}!{' '}
                                    <span aria-hidden="true" className="inline-block origin-[70%_70%] motion-safe:animate-wave">
                                        👋
                                    </span>
                                </h1>
                                <p className="mt-1 text-jubilee-muted">
                                    Here&apos;s what&apos;s happening at Jubilee Dental today.
                                </p>
                                {hasDemoRecords && (
                                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                        Demo data: sample patients are included
                                    </span>
                                )}
                            </div>
                            <LiveClock updatedAt={updatedAt} />
                        </div>

                        <div
                            role="status"
                            className={`relative mt-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${insightTone[insight.tone]}`}
                        >
                            <insight.Icon className="h-5 w-5 shrink-0" />
                            <p className="min-w-0 flex-1 text-sm font-medium">{insight.text}</p>
                            {insight.action && (
                                <button
                                    type="button"
                                    onClick={insight.action.run}
                                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-jubilee-ink shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow"
                                >
                                    {insight.action.label}
                                </button>
                            )}
                        </div>
                    </section>

                    <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                        {stats.map((stat, i) => (
                            <StatCard key={stat.key} stat={stat} index={i} />
                        ))}
                    </section>

                    <DayTimeline items={timeline} />

                    {timelineInMain && timelineCard('main')}

                    {frontDesk ? (
                        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                            {outstandingCard()}
                            {quickCard}
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                            {chartCard}
                            {quickCard}
                        </div>
                    )}

                    {frontDesk && chartCard}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <section style={at(600)} className={`${cardClass} ${rise} min-w-0 p-5 sm:p-6`}>
                            <SectionHeader title="Recent Patients" onAction={() => soon('Patients')} />
                            {recentPatients.length === 0 ? (
                                <Empty>No patients yet. Register your first patient to get started.</Empty>
                            ) : (
                                <div className="mt-3 overflow-x-auto">
                                    <table className="w-full min-w-[380px] text-left text-sm">
                                        <thead className="text-xs text-jubilee-muted">
                                            <tr>
                                                <th className="py-2 font-medium">Name</th>
                                                <th className="hidden py-2 font-medium min-[1750px]:table-cell">Phone</th>
                                                <th className="py-2 font-medium">Last Visit</th>
                                                <th className="py-2 font-medium">Next Visit</th>
                                                <th className="w-6" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentPatients.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    onClick={() => soon('Patient records')}
                                                    className="group cursor-pointer border-t border-[#eef3fa] transition-colors hover:bg-blue-50/50"
                                                >
                                                    <td className="py-3 pr-3">
                                                        <span className="flex items-center gap-3 font-medium">
                                                            <Avatar name={p.name} size={34} />
                                                            <span className="whitespace-nowrap">{p.name}</span>
                                                        </span>
                                                    </td>
                                                    <td className="hidden whitespace-nowrap py-3 pr-3 text-jubilee-muted min-[1750px]:table-cell">
                                                        {p.phone ?? '—'}
                                                    </td>
                                                    <td className="whitespace-nowrap py-3 pr-3 text-jubilee-muted">
                                                        {p.last_visit ?? '—'}
                                                    </td>
                                                    <td className="py-3 pr-3 leading-snug">{p.next_visit ?? '—'}</td>
                                                    <td className="py-3">
                                                        <ChevronRightIcon className="h-4 w-4 text-jubilee-hint transition-transform group-hover:translate-x-1 group-hover:text-jubilee-blue" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section style={at(680)} className={`${cardClass} ${rise} min-w-0 p-5 sm:p-6`}>
                            <SectionHeader title="Upcoming Follow-Ups" onAction={() => soon('Follow-ups')} />
                            {followUps.length === 0 ? (
                                <Empty>No upcoming appointments are booked yet.</Empty>
                            ) : (
                                <div className="mt-3 overflow-x-auto">
                                    <table className="w-full min-w-[340px] text-left text-sm">
                                        <thead className="text-xs text-jubilee-muted">
                                            <tr>
                                                <th className="py-2 font-medium">Patient</th>
                                                <th className="py-2 font-medium">Procedure</th>
                                                <th className="py-2 font-medium">Date</th>
                                                <th className="w-6" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {followUps.map((f) => (
                                                <tr
                                                    key={f.id}
                                                    onClick={() => soon('Follow-ups')}
                                                    className="group cursor-pointer border-t border-[#eef3fa] transition-colors hover:bg-blue-50/50"
                                                >
                                                    <td className="py-3 pr-3">
                                                        <span className="flex items-center gap-3 font-medium">
                                                            <Avatar name={f.patient} size={34} />
                                                            <span className="whitespace-nowrap">{f.patient}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-3 text-jubilee-muted">{f.procedure}</td>
                                                    <td className="whitespace-nowrap py-3 pr-3 text-jubilee-muted">{f.date}</td>
                                                    <td className="py-3">
                                                        <ChevronRightIcon className="h-4 w-4 text-jubilee-hint transition-transform group-hover:translate-x-1 group-hover:text-jubilee-blue" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                {/* Right rail */}
                <div className="min-w-0 space-y-6">
                    {!timelineInMain && timelineCard('rail')}

                    <section style={at(330)} className={`${cardClass} ${rise} p-5 sm:p-6`}>
                        <SectionHeader title="Recent Activity" />
                        {activity.length === 0 ? (
                            <Empty>
                                New appointments, payments and registrations will show up here as they happen.
                            </Empty>
                        ) : (
                            <ul className="mt-3">
                                {activity.slice(0, 5).map((n) => {
                                    const Icon = noticeIcons[n.icon] ?? BellRingIcon;

                                    return (
                                        <li
                                            key={n.key}
                                            className="flex items-center gap-3 border-t border-[#eef3fa] py-3 first:border-t-0"
                                        >
                                            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneTile[n.tone]}`}>
                                                <Icon className="h-5 w-5" />
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
                    </section>

                    {view === 'admin' && outstandingCard()}

                    <WellnessCard />
                </div>
            </div>

            <SlideOver open={finishing !== null} title="Finish visit" subtitle={finishing?.patient} onClose={() => setFinishing(null)}>
                {finishing && (
                    <CompleteVisitPanel
                        key={finishing.id}
                        appointmentId={finishing.id}
                        patient={finishing.patient}
                        services={options.services ?? []}
                        onDone={() => {
                            setFinishing(null);
                            router.reload();
                        }}
                    />
                )}
            </SlideOver>

            <SlideOver open={panel === 'patient'} title="New patient" subtitle="Register someone new to the clinic." onClose={close}>
                <NewPatientForm onDone={close} />
            </SlideOver>
            <SlideOver open={panel === 'appointment'} title="Book appointment" subtitle="Choose a patient, a time and a dentist." onClose={close}>
                <BookAppointmentForm key={prefillPatient ?? 'none'} options={options} initialPatientId={prefillPatient} onDone={close} />
            </SlideOver>
            <SlideOver open={panel === 'invoice'} title="Add invoice" subtitle="Bill a patient for a treatment." onClose={close}>
                <AddInvoiceForm options={options} onDone={close} />
            </SlideOver>
            <SlideOver open={panel === 'payment'} title="Record payment" subtitle="Receive money against an unpaid invoice." onClose={close}>
                <RecordPaymentForm key={invoiceId ?? 'none'} invoices={outstanding.invoices} initialInvoiceId={invoiceId} onDone={close} />
            </SlideOver>
            <SlideOver open={panel === 'prescription'} title="Create prescription" subtitle="Prescribe medication to a patient." onClose={close}>
                <PrescriptionForm options={options} onDone={close} />
            </SlideOver>
        </>
    );
}

Dashboard.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
