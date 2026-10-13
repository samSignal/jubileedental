import { Field, inputClass } from '@/Components/Admin/fields';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import IntakeForm from '@/Components/Clinic/IntakeForm';
import SlotBooking from '@/Components/Clinic/SlotBooking';
import {
    AlertTriangleIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClipboardIcon,
    EditIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { Avatar, cardClass, formatMoney } from '@/Components/Dashboard/ui';
import DashboardLayout, { useToast } from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Appt, DentistLite, HistoryDetails, PatientSummary } from '@/types/clinic';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, ReactNode, useState } from 'react';

type PatientProfile = PatientSummary & {
    address: string | null;
    national_id: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    medical_aid_provider: string | null;
    medical_aid_number: string | null;
    notes: string | null;
    registered: string;
    registered_by: string | null;
};

type ConsentRow = {
    id: number;
    type: string;
    label: string;
    signed_by_name: string;
    relationship: string;
    consented_at: string;
    expires_at: string | null;
    is_valid: boolean;
    revoked: boolean;
    witness: string | null;
};

type Props = PageProps<{
    patient: PatientProfile;
    history: HistoryDetails | null;
    historyRecorded: boolean;
    consents: ConsentRow[];
    conditionOptions: { key: string; label: string }[];
    appointments: (Appt & { date: string })[];
    dentists: DentistLite[];
    finance: { billed: number; paid: number; balance: number } | null;
    can: { update: boolean; book: boolean; clinical: boolean };
}>;

const statusPill: Record<string, string> = {
    scheduled: 'bg-violet-50 text-violet-700',
    waiting: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-jubilee-blue',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-500',
    no_show: 'bg-slate-100 text-slate-500',
};

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[9rem_1fr] gap-3 border-t border-[#eef3fa] py-2.5 first:border-t-0 text-sm">
            <dt className="text-jubilee-muted">{label}</dt>
            <dd className="font-medium">{value || <span className="font-normal text-jubilee-hint">Not recorded</span>}</dd>
        </div>
    );
}

function EditBasics({ patient, onDone }: { patient: PatientProfile; onDone: () => void }) {
    const [form, setForm] = useState({
        name: patient.name,
        phone: patient.phone ?? '',
        email: patient.email ?? '',
        notes: patient.notes ?? '',
    });
    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await http.patch(route('patients.update', patient.id), form);
            onDone();
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full name" error={error?.fields.name}>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Phone" error={error?.fields.phone}>
                <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email" error={error?.fields.email}>
                <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Notes" error={error?.fields.notes}>
                <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white disabled:opacity-70">
                {saving ? 'Saving…' : 'Save changes'}
            </button>
        </form>
    );
}

export default function PatientShow({
    patient,
    history,
    historyRecorded,
    consents,
    conditionOptions,
    appointments,
    dentists,
    finance,
    can,
}: Props) {
    const toast = useToast();
    const [panel, setPanel] = useState<'intake' | 'book' | 'edit' | null>(null);
    const [intake, setIntake] = useState<PatientSummary | null>(null);
    const [loading, setLoading] = useState(false);

    const reload = () => router.reload();
    const close = () => setPanel(null);

    const openIntake = async () => {
        setPanel('intake');
        setLoading(true);
        try {
            const { data } = await http.get<{ patient: PatientSummary }>(route('patients.summary', patient.id));
            setIntake(data.patient);
        } finally {
            setLoading(false);
        }
    };

    const missing = patient.intake.missing;
    const conditionLabel = (key: string) => conditionOptions.find((c) => c.key === key)?.label ?? key;
    const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'waiting');

    const revoke = (c: ConsentRow) => {
        router.patch(route('consents.revoke', c.id), {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title={patient.name} />

            <div className="mx-auto max-w-[1200px] space-y-6">
                {/* header */}
                <section className={`${cardClass} p-5 sm:p-6`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Avatar name={patient.name} size={72} />
                        <div className="min-w-0 flex-1">
                            <Link href={route('patients.index')} className="text-xs font-medium text-jubilee-blue hover:underline">
                                ← All patients
                            </Link>
                            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{patient.name}</h1>
                            <p className="text-sm text-jubilee-muted">
                                {[patient.age !== null ? `${patient.age} years` : null, patient.gender, patient.phone].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {can.book && (
                                <button type="button" onClick={() => setPanel('book')} className="flex items-center gap-2 rounded-xl bg-jubilee-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1259c4]">
                                    <CalendarIcon className="h-5 w-5" />
                                    Book appointment
                                </button>
                            )}
                            {can.update && (
                                <>
                                    <button type="button" onClick={openIntake} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-jubilee-blue ring-1 ring-blue-200 transition hover:bg-blue-50">
                                        <ClipboardIcon className="h-5 w-5" />
                                        Intake &amp; consent
                                    </button>
                                    <button type="button" onClick={() => setPanel('edit')} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                                        <EditIcon className="h-5 w-5" />
                                        Edit
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {patient.alerts && patient.alerts.length > 0 && (
                        <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-rose-900 ring-1 ring-rose-200">
                            <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold">Medical alerts</p>
                                <ul className="mt-1 flex flex-wrap gap-2">
                                    {patient.alerts.map((a) => (
                                        <li key={a} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-rose-200">
                                            {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div
                        className={`mt-5 rounded-2xl px-4 py-3 ring-1 ${
                            missing.length === 0 ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-200'
                        }`}
                    >
                        {missing.length === 0 ? (
                            <p className="flex items-center gap-2 text-sm font-semibold">
                                <CheckCircleIcon className="h-5 w-5" />
                                Intake and consent are complete. Ready for check-in.
                            </p>
                        ) : (
                            <>
                                <p className="flex items-center gap-2 text-sm font-semibold">
                                    <AlertTriangleIcon className="h-5 w-5" />
                                    {missing.length} {missing.length === 1 ? 'item' : 'items'} missing before check-in
                                </p>
                                <ul className="mt-2 flex flex-wrap gap-2">
                                    {missing.map((m) => (
                                        <li key={m.key} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-amber-200">
                                            {m.label}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="font-display text-lg font-bold tracking-tight">Contact &amp; emergency</h2>
                        <dl className="mt-3">
                            <Row label="Phone" value={patient.phone} />
                            <Row label="Email" value={patient.email} />
                            <Row label="Date of birth" value={patient.date_of_birth} />
                            <Row label="Address" value={patient.address} />
                            <Row label="National ID" value={patient.national_id} />
                            <Row
                                label="Emergency contact"
                                value={
                                    patient.emergency_contact_name
                                        ? `${patient.emergency_contact_name}${patient.emergency_contact_relationship ? ` (${patient.emergency_contact_relationship})` : ''} · ${patient.emergency_contact_phone ?? ''}`
                                        : null
                                }
                            />
                            {(patient.is_minor || patient.guardian_name) && (
                                <Row label="Guardian" value={patient.guardian_name ? `${patient.guardian_name} · ${patient.guardian_phone ?? ''}` : null} />
                            )}
                            <Row label="Medical aid" value={patient.medical_aid_provider ? `${patient.medical_aid_provider} · ${patient.medical_aid_number ?? ''}` : null} />
                            <Row label="Registered" value={`${patient.registered}${patient.registered_by ? ` by ${patient.registered_by}` : ''}`} />
                        </dl>
                    </section>

                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="font-display text-lg font-bold tracking-tight">Medical history</h2>
                        {!historyRecorded ? (
                            <p className="mt-3 rounded-xl border border-dashed border-[#cfdcf0] px-4 py-6 text-center text-sm text-jubilee-muted">
                                No medical history has been recorded yet.
                            </p>
                        ) : !can.clinical || !history ? (
                            <p className="mt-3 rounded-xl bg-blue-50 px-4 py-4 text-sm text-jubilee-ink">
                                A medical history is on file. Clinical details are visible to dentists only.
                            </p>
                        ) : (
                            <dl className="mt-3">
                                <Row label="Allergies" value={history.allergies || 'None reported'} />
                                <Row
                                    label="Conditions"
                                    value={
                                        history.conditions.length || history.other_conditions
                                            ? [...history.conditions.map(conditionLabel), history.other_conditions].filter(Boolean).join(', ')
                                            : 'None reported'
                                    }
                                />
                                <Row label="Medication" value={history.medications || 'None'} />
                                <Row label="Smoker" value={history.is_smoker ? 'Yes' : 'No'} />
                                <Row label="Pregnant" value={history.is_pregnant ? 'Yes' : 'No'} />
                                <Row label="Last dental visit" value={history.last_dental_visit} />
                            </dl>
                        )}
                    </section>

                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="font-display text-lg font-bold tracking-tight">Consents</h2>
                        {consents.length === 0 ? (
                            <p className="mt-3 text-sm text-jubilee-muted">No consent has been recorded.</p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {consents.map((c) => (
                                    <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#eef3fa] p-3">
                                        <span className="leading-tight">
                                            <span className="block text-sm font-semibold">{c.label}</span>
                                            <span className="block text-xs text-jubilee-muted">
                                                Signed by {c.signed_by_name} ({c.relationship}) on {c.consented_at}
                                                {c.witness ? ` · witnessed by ${c.witness}` : ''}
                                            </span>
                                            {c.expires_at && <span className="block text-xs text-jubilee-muted">Expires {c.expires_at}</span>}
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                                            <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${c.is_valid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {c.revoked ? 'Withdrawn' : c.is_valid ? 'Valid' : 'Expired'}
                                            </span>
                                            {can.update && c.is_valid && (
                                                <button type="button" onClick={() => revoke(c)} className="text-xs font-semibold text-rose-600 hover:underline">
                                                    Withdraw
                                                </button>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="font-display text-lg font-bold tracking-tight">Visits</h2>
                        {appointments.length === 0 ? (
                            <p className="mt-3 text-sm text-jubilee-muted">No visits yet.</p>
                        ) : (
                            <ul className="mt-3">
                                {appointments.map((a) => (
                                    <li key={a.id} className="flex items-center gap-3 border-t border-[#eef3fa] py-3 first:border-t-0">
                                        <span className="w-24 shrink-0 text-xs leading-tight text-jubilee-muted">
                                            {a.date}
                                            <span className="block">{a.time}</span>
                                        </span>
                                        <span className="min-w-0 flex-1 leading-tight">
                                            <span className="block truncate text-sm font-semibold">{a.procedure}</span>
                                            <span className="block truncate text-xs text-jubilee-muted">
                                                {a.dentist ?? 'Any dentist'}
                                                {a.queue_label ? ` · ${a.queue_label}` : ''}
                                                {a.is_walk_in ? ' · Walk-in' : ''}
                                            </span>
                                        </span>
                                        <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${statusPill[a.status] ?? ''}`}>{a.status_label}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {upcoming.length > 0 && (
                            <p className="mt-3 text-xs text-jubilee-muted">
                                Next: {upcoming[upcoming.length - 1].date} at {upcoming[upcoming.length - 1].time}
                            </p>
                        )}
                    </section>
                </div>

                {finance && (
                    <section className={`${cardClass} p-5 sm:p-6`}>
                        <h2 className="font-display text-lg font-bold tracking-tight">Billing</h2>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            {[
                                ['Billed', finance.billed, 'bg-blue-50 text-jubilee-blue'],
                                ['Paid', finance.paid, 'bg-emerald-50 text-emerald-700'],
                                ['Balance', finance.balance, finance.balance > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'],
                            ].map(([label, value, tone]) => (
                                <div key={label as string} className={`rounded-2xl px-3 py-4 ${tone}`}>
                                    <p className="font-display text-xl font-extrabold tabular-nums">{formatMoney(value as number, true)}</p>
                                    <p className="text-xs font-medium opacity-80">{label}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <SlideOver open={panel === 'intake'} title="Intake & consent" subtitle={patient.name} onClose={close}>
                {loading || !intake ? (
                    <p className="text-sm text-jubilee-muted">Loading the record…</p>
                ) : (
                    <IntakeForm
                        patient={intake}
                        canReadHistory={can.clinical}
                        onSaved={() => {
                            close();
                            reload();
                            toast('Intake saved.');
                        }}
                    />
                )}
            </SlideOver>

            <SlideOver open={panel === 'book'} title="Book appointment" subtitle={patient.name} onClose={close}>
                <SlotBooking
                    dentists={dentists}
                    patientId={patient.id}
                    onDone={() => {
                        close();
                        reload();
                        toast('Appointment booked.');
                    }}
                />
            </SlideOver>

            <SlideOver open={panel === 'edit'} title="Edit patient" subtitle={patient.name} onClose={close}>
                <EditBasics
                    patient={patient}
                    onDone={() => {
                        close();
                        reload();
                        toast('Patient updated.');
                    }}
                />
            </SlideOver>
        </>
    );
}

PatientShow.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
