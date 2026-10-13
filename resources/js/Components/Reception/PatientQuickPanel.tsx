import { Field, inputClass } from '@/Components/Admin/fields';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import {
    AlertTriangleIcon,
    BellAlertIcon,
    CheckCircleIcon,
    TicketIcon,
} from '@/Components/Dashboard/DashboardIcons';
import { Avatar } from '@/Components/Dashboard/ui';
import { Appt, DentistLite, PatientSummary } from '@/types/clinic';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

/**
 * What reception sees after picking a patient: if they are booked today, one
 * button checks them in; if not, one button adds them to the queue as a walk-in.
 * A missing consent is a single tick-box in the same step, never a separate form.
 */
export default function PatientQuickPanel({
    patient,
    dentists,
    canBook,
    onChanged,
    onBook,
    onClose,
}: {
    patient: PatientSummary;
    dentists: DentistLite[];
    canBook: boolean;
    onChanged: () => void;
    onBook: () => void;
    onClose: () => void;
}) {
    const [agree, setAgree] = useState(false);
    const [signer, setSigner] = useState({
        name: patient.is_minor ? patient.details?.guardian_name ?? '' : patient.name,
        relationship: patient.is_minor ? 'parent' : 'self',
    });
    const [walkIn, setWalkIn] = useState({ procedure: 'Consultation', dentist_id: '' as number | '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const [ticket, setTicket] = useState<Appt | null>(null);
    const [notified, setNotified] = useState<string[]>([]);

    const pending = patient.consent_pending ?? !patient.intake.complete;
    const consentPayload = pending && agree ? { signed_by_name: signer.name, relationship: signer.relationship } : undefined;

    const scheduled = patient.today.filter((a) => a.status === 'scheduled');
    const others = patient.today.filter((a) => a.status !== 'scheduled');

    const run = async (fn: () => Promise<{ appointment: Appt; notified?: string[] }>) => {
        setBusy(true);
        setError(null);

        try {
            const result = await fn();
            setTicket(result.appointment);
            setNotified(result.notified ?? (result.appointment.dentist ? [result.appointment.dentist] : []));
            onChanged();
        } catch (err) {
            setError(parseError(err));
        } finally {
            setBusy(false);
        }
    };

    const checkIn = (a: Appt) =>
        run(async () => {
            const { data } = await http.post<{ appointment: Appt; notified: string[] }>(route('appointments.check-in', a.id), {
                consent: consentPayload,
            });

            return data;
        });

    const addWalkIn = () =>
        run(async () => {
            const { data } = await http.post<{ appointment: Appt }>(route('appointments.walk-in'), {
                patient_id: patient.id,
                procedure: walkIn.procedure,
                dentist_id: walkIn.dentist_id === '' ? null : walkIn.dentist_id,
                check_in: true,
                consent: consentPayload,
            });

            return data;
        });

    if (ticket) {
        return (
            <div className="space-y-4 motion-safe:animate-pop-in">
                <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d2f74] via-[#0b2862] to-[#123e8f] text-white shadow-[0_24px_48px_-24px_rgba(11,42,111,0.8)]">
                    <div className="flex items-center justify-between px-6 pt-5 text-xs text-blue-200">
                        <span className="font-semibold uppercase tracking-[0.2em]">Queue ticket</span>
                        <span>Arrived {ticket.checked_in_time}</span>
                    </div>
                    <p className="px-6 pb-2 pt-3 font-display text-6xl font-extrabold tracking-tight">{ticket.queue_label}</p>
                    <div className="mx-4 mb-4 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                        <p className="font-semibold">{ticket.patient}</p>
                        <p className="text-blue-100">
                            {ticket.procedure} · {ticket.dentist ?? 'First available dentist'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
                    <BellAlertIcon className="mt-0.5 h-6 w-6 shrink-0" />
                    <p>
                        <span className="font-semibold">{notified.length ? `${notified.join(', ')} notified.` : 'In the shared queue.'}</span>{' '}
                        They can see this patient is ready.
                    </p>
                </div>

                <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-jubilee-blue font-semibold text-white transition hover:bg-[#1259c4]">
                    Done
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Avatar name={patient.name} size={56} />
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate font-display text-lg font-bold">{patient.name}</p>
                    <p className="truncate text-sm text-jubilee-muted">
                        {[patient.phone, patient.age !== null ? `${patient.age} yrs` : null].filter(Boolean).join(' · ') || 'No contact details'}
                    </p>
                </div>
                <Link href={route('patients.show', patient.id)} className="text-xs font-semibold text-jubilee-blue hover:underline">
                    Open profile
                </Link>
            </div>

            {(patient.alerts?.length || pending || patient.history_status !== 'ok') && (
                <div className="flex flex-wrap gap-1.5">
                    {patient.alerts?.map((a) => (
                        <span key={a} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            {a}
                        </span>
                    ))}
                    {pending && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Consent due</span>}
                    {patient.history_status === 'missing' && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">No medical history yet</span>
                    )}
                    {patient.history_status === 'outdated' && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">History needs review</span>
                    )}
                </div>
            )}

            {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    {error.message}
                </p>
            )}

            {others.length > 0 && (
                <ul className="space-y-2">
                    {others.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                            <span className="leading-tight">
                                <span className="block font-semibold">{a.procedure}</span>
                                <span className="block text-xs text-jubilee-muted">
                                    {a.time}
                                    {a.queue_label ? ` · ${a.queue_label}` : ''}
                                </span>
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-jubilee-blue">{a.status_label}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* consent: one tick, only when it is due */}
            {pending && (scheduled.length > 0 || others.length === 0) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                        <input
                            type="checkbox"
                            checked={agree}
                            onChange={(e) => setAgree(e.target.checked)}
                            className="mt-0.5 h-5 w-5 rounded border-amber-300 text-jubilee-blue focus:ring-jubilee-blue/30"
                        />
                        <span className="text-sm">
                            <span className="font-semibold">Patient agrees to treatment and to the clinic keeping their records.</span>
                            <span className="block text-xs text-jubilee-muted">Signed once a year. You can also skip it and the dentist will see it is still pending.</span>
                        </span>
                    </label>
                    {agree && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Field label="Signed by" error={error?.fields['consent.signed_by_name']}>
                                <input className={inputClass} value={signer.name} onChange={(e) => setSigner({ ...signer, name: e.target.value })} />
                            </Field>
                            <Field label="Relationship">
                                <select className={inputClass} value={signer.relationship} onChange={(e) => setSigner({ ...signer, relationship: e.target.value })}>
                                    <option value="self">The patient</option>
                                    <option value="parent">Parent</option>
                                    <option value="guardian">Legal guardian</option>
                                </select>
                            </Field>
                        </div>
                    )}
                </div>
            )}

            {scheduled.length > 0 ? (
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Booked for today</h3>
                    {scheduled.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-[#e6edf7] p-3">
                            <span className="min-w-0 flex-1 leading-tight">
                                <span className="block font-semibold">{a.procedure}</span>
                                <span className="block text-xs text-jubilee-muted">
                                    {a.time} · {a.dentist ?? 'Any dentist'}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() => checkIn(a)}
                                disabled={busy}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(23,105,224,0.8)] transition hover:-translate-y-0.5 disabled:opacity-60"
                            >
                                <TicketIcon className="h-5 w-5" />
                                {busy ? 'Checking in…' : 'Check in'}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                others.length === 0 && (
                    <div className="space-y-3 rounded-2xl border border-[#e6edf7] p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <CheckCircleIcon className="h-5 w-5 text-jubilee-blue" />
                            Not booked today. Add as a walk-in.
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Reason for visit">
                                <input className={inputClass} value={walkIn.procedure} onChange={(e) => setWalkIn({ ...walkIn, procedure: e.target.value })} />
                            </Field>
                            <Field label="Dentist">
                                <select className={inputClass} value={walkIn.dentist_id} onChange={(e) => setWalkIn({ ...walkIn, dentist_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                                    <option value="">First available</option>
                                    {dentists.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <button
                            type="button"
                            onClick={addWalkIn}
                            disabled={busy}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60"
                        >
                            <TicketIcon className="h-5 w-5" />
                            {busy ? 'Adding…' : 'Add to today’s queue'}
                        </button>
                    </div>
                )
            )}

            {canBook && (
                <button type="button" onClick={onBook} className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-jubilee-blue ring-1 ring-blue-200 transition hover:bg-blue-50">
                    Book a visit for another day
                </button>
            )}
        </div>
    );
}
