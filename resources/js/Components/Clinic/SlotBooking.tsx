import { Field, inputClass } from '@/Components/Admin/fields';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import { Appt, DentistLite } from '@/types/clinic';
import { FormEvent, useEffect, useState } from 'react';

type Slot = { time: string; label: string; at: string };

const PROCEDURES = ['Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Consultation', 'Whitening', 'Crown Fitting'];

const today = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Book or reschedule. Picking a dentist and a day loads their genuinely free
 * slots (working hours minus existing bookings); a manual time is still allowed.
 */
export default function SlotBooking({
    dentists,
    patientId,
    reschedule,
    onDone,
    submitLabel,
    defaultDate,
    defaultProcedure,
    defaultDentistId,
}: {
    dentists: DentistLite[];
    patientId?: number;
    reschedule?: Appt;
    defaultDate?: string;
    defaultProcedure?: string;
    defaultDentistId?: number | null;
    onDone: (appointment: Appt) => void;
    submitLabel?: string;
}) {
    const [dentistId, setDentistId] = useState<number | ''>(
        reschedule?.dentist_id ?? defaultDentistId ?? (dentists.length === 1 ? dentists[0].id : ''),
    );
    const [date, setDate] = useState(reschedule ? reschedule.scheduled_at.slice(0, 10) : defaultDate ?? today());
    const [time, setTime] = useState(reschedule ? reschedule.scheduled_at.slice(11, 16) : '');
    const [duration, setDuration] = useState(reschedule?.duration_minutes ?? 30);
    const [procedure, setProcedure] = useState(reschedule?.procedure ?? defaultProcedure ?? 'Checkup');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [configured, setConfigured] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (dentistId === '') {
            setSlots([]);
            return;
        }

        let cancelled = false;
        setLoadingSlots(true);

        http.get<{ slots: Slot[]; configured: boolean }>(route('appointments.availability'), {
            params: { dentist_id: dentistId, date, duration, ignore: reschedule?.id },
        })
            .then(({ data }) => {
                if (cancelled) return;
                setSlots(data.slots);
                setConfigured(data.configured);
            })
            .catch(() => !cancelled && setSlots([]))
            .finally(() => !cancelled && setLoadingSlots(false));

        return () => {
            cancelled = true;
        };
    }, [dentistId, date, duration, reschedule?.id]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();

        if (!time) {
            setError({ message: 'Choose a time first.', fields: { scheduled_at: 'Choose a time first.' } });
            return;
        }

        setSaving(true);
        setError(null);

        const scheduled_at = `${date} ${time}`;

        try {
            if (reschedule) {
                const { data } = await http.patch<{ appointment: Appt }>(route('appointments.reschedule', reschedule.id), {
                    scheduled_at,
                    dentist_id: dentistId === '' ? null : dentistId,
                    duration_minutes: duration,
                });
                onDone(data.appointment);
            } else {
                const { data } = await http.post<{ appointment: Appt }>(route('appointments.store'), {
                    patient_id: patientId,
                    dentist_id: dentistId === '' ? null : dentistId,
                    procedure,
                    scheduled_at,
                    duration_minutes: duration,
                });
                onDone(data.appointment);
            }
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {error.message}
                </p>
            )}

            {!reschedule && (
                <Field label="Procedure" error={error?.fields.procedure}>
                    <input className={inputClass} list="slot-procedures" value={procedure} onChange={(e) => setProcedure(e.target.value)} />
                    <datalist id="slot-procedures">
                        {PROCEDURES.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dentist" error={error?.fields.dentist_id}>
                    <select
                        className={inputClass}
                        value={dentistId}
                        onChange={(e) => {
                            setDentistId(e.target.value === '' ? '' : Number(e.target.value));
                            setTime('');
                        }}
                    >
                        <option value="">Any available</option>
                        {dentists.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Date">
                    <input
                        className={inputClass}
                        type="date"
                        value={date}
                        min={today()}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setTime('');
                        }}
                    />
                </Field>
            </div>

            <Field label="Length of visit">
                <select
                    className={inputClass}
                    value={duration}
                    onChange={(e) => {
                        setDuration(Number(e.target.value));
                        setTime('');
                    }}
                >
                    {[15, 30, 45, 60, 90].map((m) => (
                        <option key={m} value={m}>
                            {m} minutes
                        </option>
                    ))}
                </select>
            </Field>

            <div>
                <span className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                    Available times
                    {dentistId !== '' && !configured && (
                        <span className="text-xs font-normal text-jubilee-muted">Using default clinic hours</span>
                    )}
                </span>

                {dentistId === '' ? (
                    <p className="rounded-xl border border-dashed border-[#cfdcf0] px-4 py-3 text-sm text-jubilee-muted">
                        Choose a dentist to see their free times, or enter a time below.
                    </p>
                ) : loadingSlots ? (
                    <p className="text-sm text-jubilee-muted">Checking the diary…</p>
                ) : slots.length === 0 ? (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                        No free times on this day. Try another date.
                    </p>
                ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => (
                            <button
                                key={s.time}
                                type="button"
                                onClick={() => setTime(s.time)}
                                aria-pressed={time === s.time}
                                className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${
                                    time === s.time
                                        ? 'bg-jubilee-blue text-white shadow-[0_8px_18px_-8px_rgba(23,105,224,0.8)]'
                                        : 'bg-[#f2f6fc] text-jubilee-ink hover:bg-blue-100'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Field label="Or enter a time" error={error?.fields.scheduled_at}>
                <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>

            <button
                type="submit"
                disabled={saving}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:opacity-70"
            >
                {saving ? 'Saving…' : submitLabel ?? (reschedule ? 'Move appointment' : 'Book appointment')}
            </button>
        </form>
    );
}
