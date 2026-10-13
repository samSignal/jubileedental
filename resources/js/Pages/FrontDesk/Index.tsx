import BookFlow from '@/Components/Clinic/BookFlow';
import { http, parseError } from '@/Components/Clinic/api';
import PatientSearch from '@/Components/Clinic/PatientSearch';
import RegisterPatientForm from '@/Components/Clinic/RegisterPatientForm';
import SlotBooking from '@/Components/Clinic/SlotBooking';
import {
    AlertTriangleIcon,
    BellAlertIcon,
    CalendarIcon,
    CardIcon,
    ClockIcon,
    TicketIcon,
    UserPlusIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { Avatar, cardClass, formatMoney, greetingFor } from '@/Components/Dashboard/ui';
import CollectPaymentPanel from '@/Components/Reception/CollectPaymentPanel';
import PatientQuickPanel from '@/Components/Reception/PatientQuickPanel';
import DashboardLayout, { useToast } from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Appt, Billing, PatientSummary, ServiceItem } from '@/types/clinic';
import { Head, Link, router, usePoll } from '@inertiajs/react';
import { ReactNode, useCallback, useState } from 'react';

type Row = Appt;

type Props = PageProps<{
    rows: Row[];
    stats: { appointments: number; waiting: number; with_dentist: number; to_collect: number; collected: number | null };
    dentists: { id: number; name: string; configured: boolean }[];
    services: ServiceItem[];
    can: { createPatient: boolean; book: boolean; collect: boolean };
}>;

const LIVE = ['rows', 'stats', 'notifications'];

function Tag({ tone, children }: { tone: 'amber' | 'blue' | 'rose'; children: ReactNode }) {
    const styles = {
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-blue-50 text-jubilee-blue',
        rose: 'bg-rose-50 text-rose-700',
    };

    return <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${styles[tone]}`}>{children}</span>;
}

function Section({ title, count, tone, children }: { title: string; count: number; tone: string; children: ReactNode }) {
    if (count === 0) return null;

    return (
        <div className="mt-5 first:mt-0">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-jubilee-hint">
                {title}
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] tracking-normal ${tone}`}>{count}</span>
            </h3>
            <ul className="space-y-2">{children}</ul>
        </div>
    );
}

export default function Reception({ auth, rows, stats, dentists, services, can }: Props) {
    const toast = useToast();
    const [quick, setQuick] = useState<PatientSummary | null>(null);
    const [panel, setPanel] = useState<'register' | 'book' | 'bookFor' | null>(null);
    const [bookFor, setBookFor] = useState<{ id: number; name: string; dentist_id?: number | null; date?: string; procedure?: string } | null>(null);
    const [paying, setPaying] = useState<(Appt & { billing: Billing }) | null>(null);
    const [moving, setMoving] = useState<Appt | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    usePoll(15_000, { only: LIVE });

    const refresh = useCallback(() => router.reload({ only: LIVE }), []);
    const lite = dentists.map((d) => ({ id: d.id, name: d.name }));
    const first = auth.user.name.split(' ')[0];

    const waiting = rows.filter((r) => r.status === 'waiting').sort((a, b) => (a.queue_number ?? 0) - (b.queue_number ?? 0));
    const withDentist = rows.filter((r) => r.status === 'in_progress');
    const expected = rows.filter((r) => r.status === 'scheduled');
    const toPay = rows.filter((r) => r.status === 'completed' && r.billing && !r.billing.settled);
    const done = rows.filter((r) => r.status === 'completed' && (!r.billing || r.billing.settled));

    const openPatient = async (id: number) => {
        const { data } = await http.get<{ patient: PatientSummary }>(route('patients.summary', id));
        setQuick(data.patient);
    };

    const quickCheckIn = async (a: Row) => {
        // Consent still due? Open the patient panel so it can be ticked in the same step.
        if (a.consent_pending) {
            await openPatient(a.patient_id);
            return;
        }

        setBusyId(a.id);
        try {
            const { data } = await http.post<{ appointment: Appt; notified: string[] }>(route('appointments.check-in', a.id));
            toast(`${data.appointment.patient} is ${data.appointment.queue_label}. ${data.notified.join(', ') || 'The dentist'} notified.`);
            refresh();
        } catch (err) {
            toast(parseError(err).message);
        } finally {
            setBusyId(null);
        }
    };

    const remind = async (a: Row) => {
        setBusyId(a.id);
        try {
            const { data } = await http.post<{ notified: string[] }>(route('appointments.notify', a.id));
            toast(`Reminder sent to ${data.notified.join(', ')}.`);
        } catch (err) {
            toast(parseError(err).message);
        } finally {
            setBusyId(null);
        }
    };

    const flags = (r: Row) => (
        <>
            {r.is_walk_in && <Tag tone="blue">Walk-in</Tag>}
            {r.consent_pending && r.status !== 'completed' && <Tag tone="amber">Consent due</Tag>}
            {r.history_status === 'missing' && r.status !== 'completed' && <Tag tone="amber">No history</Tag>}
            {r.history_status === 'outdated' && r.status !== 'completed' && <Tag tone="amber">History review</Tag>}
            {r.alerts?.map((al) => (
                <Tag key={al} tone="rose">
                    {al}
                </Tag>
            ))}
        </>
    );

    const identity = (r: Row) => (
        <span className="min-w-0 flex-1 leading-tight">
            <Link href={route('patients.show', r.patient_id)} className="block truncate font-semibold hover:text-jubilee-blue">
                {r.patient}
            </Link>
            <span className="block truncate text-xs text-jubilee-muted">
                {r.procedure} · {r.dentist ?? 'Any dentist'}
            </span>
        </span>
    );

    return (
        <>
            <Head title="Reception" />

            <div className="mx-auto max-w-[1100px] space-y-6">
                <header className="motion-safe:animate-fade-up">
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {greetingFor(new Date())}, {first}!
                    </h1>
                    <p className="mt-1 text-jubilee-muted">
                        Jubilee Dental · Today&apos;s clinic ·{' '}
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </header>

                <section aria-label="Today at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-blue-50 px-5 py-4 text-jubilee-blue">
                        <p className="font-display text-4xl font-extrabold tabular-nums">{stats.appointments}</p>
                        <p className="text-sm font-medium opacity-80">Appointments</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-5 py-4 text-amber-800">
                        <p className="font-display text-4xl font-extrabold tabular-nums">{stats.waiting}</p>
                        <p className="text-sm font-medium opacity-80">Waiting</p>
                    </div>
                    {stats.collected !== null && (
                        <div className="col-span-2 rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-800 sm:col-span-1">
                            <p className="font-display text-4xl font-extrabold tabular-nums">{formatMoney(stats.collected)}</p>
                            <p className="text-sm font-medium opacity-80">
                                Collected today{stats.to_collect > 0 ? ` · ${stats.to_collect} to collect` : ''}
                            </p>
                        </div>
                    )}
                </section>

                {/* find / register / book: always one tap away */}
                <section aria-label="Find a patient" className={`${cardClass} p-5 sm:p-6`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                            <PatientSearch
                                onSelect={(p) => openPatient(p.id)}
                                onRegister={can.createPatient ? () => setPanel('register') : undefined}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 lg:w-80">
                            {can.createPatient && (
                                <button
                                    type="button"
                                    onClick={() => setPanel('register')}
                                    className="flex flex-col items-start gap-2 rounded-2xl bg-gradient-to-br from-jubilee-blue to-[#2b86f5] p-4 text-left text-white shadow-[0_14px_28px_-14px_rgba(23,105,224,0.8)] transition hover:-translate-y-0.5"
                                >
                                    <UserPlusIcon className="h-6 w-6" />
                                    <span className="leading-tight">
                                        <span className="block font-semibold">Register patient</span>
                                        <span className="block text-xs text-white/80">New patient</span>
                                    </span>
                                </button>
                            )}
                            {can.book && (
                                <button
                                    type="button"
                                    onClick={() => setPanel('book')}
                                    className="flex flex-col items-start gap-2 rounded-2xl bg-[#f2f6fc] p-4 text-left transition hover:-translate-y-0.5 hover:bg-blue-100"
                                >
                                    <CalendarIcon className="h-6 w-6 text-jubilee-blue" />
                                    <span className="leading-tight">
                                        <span className="block font-semibold">New appointment</span>
                                        <span className="block text-xs text-jubilee-muted">Book a visit</span>
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* today's queue */}
                <section aria-label="Today's patient queue" className={`${cardClass} p-5 sm:p-6`}>
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-xl font-bold tracking-tight">Today&apos;s patient queue</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Live
                        </span>
                    </div>

                    {rows.length === 0 && (
                        <p className="mt-5 rounded-2xl border border-dashed border-[#cfdcf0] px-4 py-10 text-center text-sm text-jubilee-muted">
                            No one is booked today. Search for a patient above to add a walk-in.
                        </p>
                    )}

                    <div className="mt-5">
                        <Section title="Waiting" count={waiting.length} tone="bg-amber-50 text-amber-800">
                            {waiting.map((r) => {
                                const long = (r.waiting_minutes ?? 0) >= 20;

                                return (
                                    <li key={r.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${long ? 'border-amber-200 bg-amber-50/60' : 'border-[#eef3fa]'}`}>
                                        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-jubilee-navy font-display text-base font-extrabold text-white">
                                            {r.queue_label}
                                        </span>
                                        <span className="min-w-0 flex-1 leading-tight">
                                            {identity(r)}
                                            <span className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${long ? 'text-rose-600' : 'text-amber-600'}`}>
                                                <ClockIcon className="h-3.5 w-3.5" />
                                                Arrived {r.checked_in_time} · waiting {r.waiting_minutes ?? 0} min
                                            </span>
                                            <span className="mt-1 flex flex-wrap gap-1">{flags(r)}</span>
                                        </span>
                                        <button
                                            type="button"
                                            disabled={busyId === r.id}
                                            onClick={() => remind(r)}
                                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-jubilee-blue transition hover:bg-blue-100 disabled:opacity-60"
                                        >
                                            <BellAlertIcon className="h-4 w-4" />
                                            Remind
                                        </button>
                                    </li>
                                );
                            })}
                        </Section>

                        <Section title="With the dentist" count={withDentist.length} tone="bg-blue-50 text-jubilee-blue">
                            {withDentist.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-blue-50/60 p-3">
                                    <span className="grid h-11 w-16 shrink-0 place-items-center rounded-xl bg-jubilee-blue text-sm font-bold text-white">{r.queue_label ?? '—'}</span>
                                    {identity(r)}
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-semibold text-jubilee-blue motion-safe:animate-pulse">With dentist</span>
                                </li>
                            ))}
                        </Section>

                        <Section title="Ready to pay" count={toPay.length} tone="bg-emerald-50 text-emerald-700">
                            {toPay.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3">
                                    <Avatar name={r.patient} size={44} />
                                    {identity(r)}
                                    {can.collect && r.billing && (
                                        <button
                                            type="button"
                                            onClick={() => setPaying(r as Appt & { billing: Billing })}
                                            className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,0.9)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
                                        >
                                            <CardIcon className="h-5 w-5" />
                                            {r.billing.total > 0 ? `Collect ${formatMoney(r.billing.balance || r.billing.total)}` : 'Bill & collect'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </Section>

                        <Section title="Expected" count={expected.length} tone="bg-violet-50 text-violet-700">
                            {expected.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#eef3fa] p-3">
                                    <span className="w-16 shrink-0 text-xs font-semibold text-jubilee-muted">{r.time}</span>
                                    <Avatar name={r.patient} size={40} />
                                    <span className="min-w-0 flex-1 leading-tight">
                                        {identity(r)}
                                        <span className="mt-1 flex flex-wrap gap-1">{flags(r)}</span>
                                    </span>
                                    {can.book && (
                                        <button
                                            type="button"
                                            onClick={() => setMoving(r)}
                                            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-jubilee-muted ring-1 ring-slate-200 transition hover:bg-slate-50"
                                        >
                                            Move
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={busyId === r.id}
                                        onClick={() => quickCheckIn(r)}
                                        className="flex shrink-0 items-center gap-2 rounded-xl bg-jubilee-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1259c4] disabled:opacity-60"
                                    >
                                        <TicketIcon className="h-5 w-5" />
                                        Check in
                                    </button>
                                </li>
                            ))}
                        </Section>

                        <Section title="Done" count={done.length} tone="bg-slate-100 text-slate-600">
                            {done.map((r) => (
                                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                                    <Avatar name={r.patient} size={36} />
                                    {identity(r)}
                                    {r.billing?.invoice_number && <Tag tone="blue">Paid · {r.billing.invoice_number}</Tag>}
                                    {can.book && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBookFor({ id: r.patient_id, name: r.patient, dentist_id: r.dentist_id, procedure: 'Follow-up' });
                                                setPanel('bookFor');
                                            }}
                                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-jubilee-blue ring-1 ring-blue-200 transition hover:bg-blue-50"
                                        >
                                            Book next
                                        </button>
                                    )}
                                </li>
                            ))}
                        </Section>
                    </div>
                </section>

                <p className="flex items-center gap-2 text-xs text-jubilee-hint">
                    <AlertTriangleIcon className="h-4 w-4" />
                    Medical history and allergies are reviewed by the dentist before treatment.
                </p>
            </div>

            {/* one patient: check in or add as a walk-in */}
            <SlideOver open={quick !== null} title="Check in" subtitle={quick?.name} onClose={() => setQuick(null)}>
                {quick && (
                    <PatientQuickPanel
                        key={quick.id}
                        patient={quick}
                        dentists={lite}
                        canBook={can.book}
                        onChanged={refresh}
                        onBook={() => {
                            setBookFor({ id: quick.id, name: quick.name });
                            setQuick(null);
                            setPanel('bookFor');
                        }}
                        onClose={() => setQuick(null)}
                    />
                )}
            </SlideOver>

            <SlideOver open={panel === 'register'} title="Register patient" subtitle="Just the essentials." onClose={() => setPanel(null)}>
                <RegisterPatientForm
                    onCancel={() => setPanel(null)}
                    onCreated={async (p) => {
                        setPanel(null);
                        await openPatient(p.id);
                    }}
                />
            </SlideOver>

            <SlideOver open={panel === 'book'} title="New appointment" subtitle="Find the patient, then pick a time." onClose={() => setPanel(null)}>
                <BookFlow
                    dentists={lite}
                    onBooked={() => {
                        setPanel(null);
                        refresh();
                        toast('Appointment booked.');
                    }}
                />
            </SlideOver>

            <SlideOver open={panel === 'bookFor' && bookFor !== null} title="Book a visit" subtitle={bookFor?.name} onClose={() => setPanel(null)}>
                {bookFor && (
                    <BookFlow
                        dentists={lite}
                        patient={{ id: bookFor.id, name: bookFor.name }}
                        defaultProcedure={bookFor.procedure}
                        defaultDentistId={bookFor.dentist_id}
                        onBooked={() => {
                            setPanel(null);
                            refresh();
                            toast('Appointment booked.');
                        }}
                    />
                )}
            </SlideOver>

            <SlideOver open={paying !== null} title="Collect payment" subtitle={paying?.patient} onClose={() => setPaying(null)}>
                {paying && (
                    <CollectPaymentPanel
                        key={paying.id}
                        visit={paying}
                        services={services}
                        dentists={lite}
                        onPaid={refresh}
                        onClose={() => {
                            setPaying(null);
                            refresh();
                        }}
                    />
                )}
            </SlideOver>

            <SlideOver open={moving !== null} title="Move appointment" subtitle={moving ? `${moving.patient} · currently ${moving.time}` : undefined} onClose={() => setMoving(null)}>
                {moving && (
                    <SlotBooking
                        key={moving.id}
                        dentists={lite}
                        reschedule={moving}
                        onDone={() => {
                            setMoving(null);
                            refresh();
                            toast('Appointment moved.');
                        }}
                    />
                )}
            </SlideOver>
        </>
    );
}

Reception.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
