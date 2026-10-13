import PatientSearch from '@/Components/Clinic/PatientSearch';
import RegisterPatientForm from '@/Components/Clinic/RegisterPatientForm';
import SlotBooking from '@/Components/Clinic/SlotBooking';
import {
    AlertTriangleIcon,
    CalendarIcon,
    ChevronRightIcon,
    PlusIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { Avatar, cardClass } from '@/Components/Dashboard/ui';
import DashboardLayout, { useToast } from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Appt, PatientSummary } from '@/types/clinic';
import { Head, Link, router } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

type DentistCol = {
    id: number;
    name: string;
    configured: boolean;
    hours: { start: string; end: string; label: string }[];
};

type Props = PageProps<{
    date: string;
    is_today: boolean;
    is_past: boolean;
    dentists: DentistCol[];
    appointments: Appt[];
    can: { book: boolean; queue: boolean; treat: boolean };
}>;

const pill: Record<string, string> = {
    scheduled: 'bg-violet-50 text-violet-700',
    waiting: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-jubilee-blue',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-500',
    no_show: 'bg-slate-100 text-slate-500',
};

const shift = (iso: string, days: number) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);

    return d.toLocaleDateString('en-CA');
};

export default function AppointmentsIndex({ date, is_today, is_past, dentists, appointments, can }: Props) {
    const toast = useToast();
    const [booking, setBooking] = useState<'search' | 'register' | 'slot' | null>(null);
    const [chosen, setChosen] = useState<PatientSummary | null>(null);
    const [registerName, setRegisterName] = useState('');
    const [moving, setMoving] = useState<Appt | null>(null);

    const visit = (d: string) =>
        router.get(route('appointments.index'), { date: d }, { preserveScroll: true, preserveState: true, only: ['date', 'is_today', 'is_past', 'dentists', 'appointments'] });
    const refresh = () => router.reload({ only: ['appointments', 'dentists'] });

    const columns = [
        ...dentists.map((d) => ({ key: String(d.id), dentist: d as DentistCol | null, items: appointments.filter((a) => a.dentist_id === d.id) })),
        ...(appointments.some((a) => a.dentist_id === null)
            ? [{ key: 'none', dentist: null, items: appointments.filter((a) => a.dentist_id === null) }]
            : []),
    ];

    const act = (a: Appt, status: 'waiting' | 'cancelled') =>
        router.patch(route('appointments.status', a.id), { status }, {
            preserveScroll: true,
            only: ['appointments', 'flash'],
            onError: (errors) => toast(errors.intake ?? errors.status ?? 'That could not be done.'),
        });

    const close = () => {
        setBooking(null);
        setChosen(null);
    };

    const heading = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <>
            <Head title="Appointments" />

            <div className="mx-auto max-w-[1400px] space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Appointments</h1>
                        <p className="mt-1 text-jubilee-muted">{heading}{is_today ? ' · Today' : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#e6edf7]">
                            <button type="button" onClick={() => visit(shift(date, -1))} aria-label="Previous day" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-blue-50">
                                <ChevronRightIcon className="h-5 w-5 rotate-180" />
                            </button>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => e.target.value && visit(e.target.value)}
                                aria-label="Choose a date"
                                className="border-0 bg-transparent text-sm font-semibold focus:ring-0"
                            />
                            <button type="button" onClick={() => visit(shift(date, 1))} aria-label="Next day" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-blue-50">
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {!is_today && (
                            <button type="button" onClick={() => visit(new Date().toLocaleDateString('en-CA'))} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-jubilee-blue ring-1 ring-blue-200 hover:bg-blue-50">
                                Today
                            </button>
                        )}
                        {can.book && (
                            <button type="button" onClick={() => setBooking('search')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5">
                                <PlusIcon className="h-5 w-5" />
                                Book
                            </button>
                        )}
                    </div>
                </header>

                {columns.length === 0 ? (
                    <section className={`${cardClass} p-10 text-center`}>
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-jubilee-blue">
                            <CalendarIcon className="h-7 w-7" />
                        </span>
                        <p className="mt-3 text-jubilee-muted">No dentists are set up and nothing is booked for this day.</p>
                    </section>
                ) : (
                    <div className={`grid gap-5 ${columns.length > 1 ? 'lg:grid-cols-2 2xl:grid-cols-3' : ''}`}>
                        {columns.map((col) => (
                            <section key={col.key} className={`${cardClass} p-5`}>
                                <header className="flex items-center gap-3">
                                    <Avatar name={col.dentist?.name ?? 'Unassigned'} size={44} />
                                    <div className="leading-tight">
                                        <h2 className="font-display text-base font-bold">{col.dentist?.name ?? 'Unassigned'}</h2>
                                        <p className="text-xs text-jubilee-muted">
                                            {col.dentist
                                                ? col.dentist.configured
                                                    ? col.dentist.hours.length
                                                        ? col.dentist.hours.map((h) => h.label).join(' · ')
                                                        : 'Not working this day'
                                                    : 'Working hours not set'
                                                : 'Any dentist can take these'}
                                        </p>
                                    </div>
                                    <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-jubilee-blue">
                                        {col.items.filter((i) => i.status !== 'cancelled' && i.status !== 'no_show').length}
                                    </span>
                                </header>

                                {col.items.length === 0 ? (
                                    <p className="mt-4 rounded-xl border border-dashed border-[#cfdcf0] px-4 py-6 text-center text-sm text-jubilee-muted">Nothing booked.</p>
                                ) : (
                                    <ul className="mt-4 space-y-2">
                                        {col.items.map((a) => {
                                            const gaps = a.intake_missing?.length ?? 0;
                                            const open = a.status === 'scheduled' || a.status === 'waiting';

                                            return (
                                                <li key={a.id} className="rounded-2xl border border-[#eef3fa] p-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-[4.2rem] shrink-0 text-xs font-semibold leading-tight">
                                                            {a.time}
                                                            <span className="block font-normal text-jubilee-muted">to {a.ends}</span>
                                                        </span>
                                                        <span className="min-w-0 flex-1 leading-tight">
                                                            <Link href={route('patients.show', a.patient_id)} className="block truncate text-sm font-semibold hover:text-jubilee-blue">
                                                                {a.patient}
                                                            </Link>
                                                            <span className="block truncate text-xs text-jubilee-muted">
                                                                {a.procedure}
                                                                {a.queue_label ? ` · ${a.queue_label}` : ''}
                                                                {a.is_walk_in ? ' · Walk-in' : ''}
                                                            </span>
                                                        </span>
                                                        <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${pill[a.status]}`}>{a.status_label}</span>
                                                    </div>

                                                    {(a.alerts?.length || (gaps > 0 && a.status === 'scheduled')) && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5 pl-[4.7rem]">
                                                            {gaps > 0 && a.status === 'scheduled' && (
                                                                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-700">
                                                                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                                                                    Intake: {gaps} missing
                                                                </span>
                                                            )}
                                                            {a.alerts?.map((al) => (
                                                                <span key={al} className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.68rem] font-semibold text-rose-700">
                                                                    {al}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {open && !is_past && (
                                                        <div className="mt-2 flex flex-wrap gap-2 pl-[4.7rem]">
                                                            {can.queue && a.status === 'scheduled' && is_today && (
                                                                <button type="button" onClick={() => act(a, 'waiting')} className="rounded-lg bg-jubilee-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1259c4]">
                                                                    Check in
                                                                </button>
                                                            )}
                                                            {can.book && (
                                                                <button type="button" onClick={() => setMoving(a)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-jubilee-muted ring-1 ring-slate-200 hover:bg-slate-50">
                                                                    Reschedule
                                                                </button>
                                                            )}
                                                            {can.queue && a.status === 'scheduled' && (
                                                                <button type="button" onClick={() => act(a, 'cancelled')} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>

            <SlideOver open={booking !== null} title="Book appointment" subtitle={chosen ? chosen.name : 'Find or register the patient first.'} onClose={close}>
                {booking === 'search' && (
                    <PatientSearch
                        autoFocus
                        onSelect={(p) => { setChosen(p); setBooking('slot'); }}
                        onRegister={(q) => { setRegisterName(q); setBooking('register'); }}
                    />
                )}
                {booking === 'register' && (
                    <RegisterPatientForm
                        initialName={registerName}
                        onCancel={() => setBooking('search')}
                        onCreated={(p) => { setChosen(p); setBooking('slot'); }}
                    />
                )}
                {booking === 'slot' && chosen && (
                    <SlotBooking
                        dentists={dentists.map((d) => ({ id: d.id, name: d.name }))}
                        patientId={chosen.id}
                        onDone={() => { close(); refresh(); toast('Appointment booked.'); }}
                    />
                )}
            </SlideOver>

            <SlideOver open={moving !== null} title="Reschedule" subtitle={moving ? `${moving.patient} · currently ${moving.time}` : undefined} onClose={() => setMoving(null)}>
                {moving && (
                    <SlotBooking
                        key={moving.id}
                        dentists={dentists.map((d) => ({ id: d.id, name: d.name }))}
                        reschedule={moving}
                        onDone={() => { setMoving(null); refresh(); toast('Appointment moved.'); }}
                    />
                )}
            </SlideOver>
        </>
    );
}

AppointmentsIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
