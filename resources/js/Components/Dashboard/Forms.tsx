import { formatMoney } from '@/Components/Dashboard/ui';
import { Options, OutstandingInvoice } from '@/types/clinic';
import { useForm } from '@inertiajs/react';
import {
    FormEvent,
    KeyboardEvent,
    PropsWithChildren,
    useMemo,
    useState,
} from 'react';

const inputClass =
    'block w-full rounded-xl border border-[#cfdcf0] bg-white px-4 py-3 text-base text-jubilee-ink placeholder:text-jubilee-hint transition focus:border-jubilee-blue focus:ring-4 focus:ring-jubilee-blue/15 disabled:bg-slate-50';

function Field({
    label,
    error,
    hint,
    children,
}: PropsWithChildren<{ label: string; error?: string; hint?: string }>) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-jubilee-ink">
                {label}
            </span>
            {children}
            {hint && !error && (
                <span className="mt-1.5 block text-xs text-jubilee-muted">{hint}</span>
            )}
            {error && (
                <span role="alert" className="mt-1.5 block text-sm text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}

function Submit({ processing, children }: PropsWithChildren<{ processing: boolean }>) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/30 disabled:translate-y-0 disabled:opacity-70"
        >
            {processing ? 'Saving…' : children}
        </button>
    );
}

/** Type-to-filter patient chooser; keeps working with hundreds of records. */
function PatientPicker({
    patients,
    value,
    onChange,
    error,
}: {
    patients: Options['patients'];
    value: number | '';
    onChange: (id: number) => void;
    error?: string;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = patients.find((p) => p.id === value);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();

        return patients
            .filter((p) => !q || `${p.name} ${p.phone ?? ''}`.toLowerCase().includes(q))
            .slice(0, 7);
    }, [patients, query]);

    const choose = (id: number) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(matches.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter' && open && matches[active]) {
            e.preventDefault();
            choose(matches[active].id);
        } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <Field label="Patient" error={error}>
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    value={open ? query : selected?.name ?? ''}
                    placeholder="Search by name or phone…"
                    onFocus={() => {
                        setOpen(true);
                        setQuery('');
                        setActive(0);
                    }}
                    onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    className={inputClass}
                />
            </Field>

            {open && (
                <ul
                    role="listbox"
                    className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-xl bg-white p-1 shadow-[0_18px_40px_-14px_rgba(11,42,111,0.4)] ring-1 ring-[#e6edf7]"
                >
                    {matches.length === 0 && (
                        <li className="px-3 py-3 text-sm text-jubilee-muted">
                            No patient found. Register them first.
                        </li>
                    )}
                    {matches.map((p, i) => (
                        <li
                            key={p.id}
                            role="option"
                            aria-selected={i === active}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(p.id);
                            }}
                            onMouseEnter={() => setActive(i)}
                            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${
                                i === active ? 'bg-blue-50 text-jubilee-blue' : ''
                            }`}
                        >
                            <span className="font-medium">{p.name}</span>
                            {p.phone && (
                                <span className="ml-2 text-xs text-jubilee-muted">{p.phone}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

type FormProps = { onDone: () => void };

export function NewPatientForm({ onDone }: FormProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        gender: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('patients.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full name" error={errors.name}>
                <input className={inputClass} value={data.name} onChange={(e) => setData('name', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Phone" error={errors.phone}>
                <input className={inputClass} type="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="+263 77 123 4567" />
            </Field>
            <Field label="Email (optional)" error={errors.email}>
                <input className={inputClass} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date of birth" error={errors.date_of_birth}>
                    <input className={inputClass} type="date" value={data.date_of_birth} onChange={(e) => setData('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Gender" error={errors.gender}>
                    <select className={inputClass} value={data.gender} onChange={(e) => setData('gender', e.target.value)}>
                        <option value="">Not specified</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                    </select>
                </Field>
            </div>
            <Submit processing={processing}>Register patient</Submit>
        </form>
    );
}

const PROCEDURES = ['Checkup', 'Cleaning', 'Filling', 'Root Canal', 'Extraction', 'Consultation', 'Whitening', 'Crown Fitting'];

function nextSlot(): { date: string; time: string } {
    const d = new Date();
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');

    return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
}

export function BookAppointmentForm({
    options,
    onDone,
    initialPatientId,
}: FormProps & { options: Options; initialPatientId?: number }) {
    const slot = useMemo(nextSlot, []);
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        patient_id: (initialPatientId ?? '') as number | '',
        procedure: 'Checkup',
        date: slot.date,
        time: slot.time,
        dentist_id: '' as number | '',
        duration_minutes: 30,
    });

    transform((d) => ({
        patient_id: d.patient_id,
        procedure: d.procedure,
        scheduled_at: `${d.date} ${d.time}`,
        dentist_id: d.dentist_id === '' ? null : d.dentist_id,
        duration_minutes: d.duration_minutes,
    }));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('appointments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <PatientPicker patients={options.patients} value={data.patient_id} onChange={(id) => setData('patient_id', id)} error={errors.patient_id} />
            <Field label="Procedure" error={errors.procedure}>
                <input className={inputClass} list="procedure-list" value={data.procedure} onChange={(e) => setData('procedure', e.target.value)} />
                <datalist id="procedure-list">
                    {PROCEDURES.map((p) => (
                        <option key={p} value={p} />
                    ))}
                </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date" error={(errors as Record<string, string | undefined>).scheduled_at}>
                    <input className={inputClass} type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                </Field>
                <Field label="Time">
                    <input className={inputClass} type="time" value={data.time} onChange={(e) => setData('time', e.target.value)} />
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Dentist" error={errors.dentist_id}>
                    <select className={inputClass} value={data.dentist_id} onChange={(e) => setData('dentist_id', e.target.value === '' ? '' : Number(e.target.value))}>
                        <option value="">Any available</option>
                        {options.dentists.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Duration" error={errors.duration_minutes}>
                    <select className={inputClass} value={data.duration_minutes} onChange={(e) => setData('duration_minutes', Number(e.target.value))}>
                        {[15, 30, 45, 60, 90].map((m) => (
                            <option key={m} value={m}>{m} min</option>
                        ))}
                    </select>
                </Field>
            </div>
            <Submit processing={processing}>Book appointment</Submit>
        </form>
    );
}

export function AddInvoiceForm({ options, onDone }: FormProps & { options: Options }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        patient_id: '' as number | '',
        description: '',
        amount: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('invoices.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <PatientPicker patients={options.patients} value={data.patient_id} onChange={(id) => setData('patient_id', id)} error={errors.patient_id} />
            <Field label="Description" error={errors.description}>
                <input className={inputClass} list="procedure-list" value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="e.g. Filling" />
                <datalist id="procedure-list">
                    {PROCEDURES.map((p) => (
                        <option key={p} value={p} />
                    ))}
                </datalist>
            </Field>
            <Field label="Amount (USD)" error={errors.amount}>
                <input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={data.amount} onChange={(e) => setData('amount', e.target.value)} />
            </Field>
            <Submit processing={processing}>Create invoice</Submit>
        </form>
    );
}

export function RecordPaymentForm({
    invoices,
    initialInvoiceId,
    onDone,
}: FormProps & { invoices: OutstandingInvoice[]; initialInvoiceId?: number }) {
    const initial = invoices.find((i) => i.id === initialInvoiceId);
    const { data, setData, post, processing, errors, reset } = useForm({
        invoice_id: (initial?.id ?? '') as number | '',
        amount: initial ? String(initial.balance) : '',
        method: 'cash',
    });
    const invoice = invoices.find((i) => i.id === data.invoice_id);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('payments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    if (invoices.length === 0) {
        return (
            <p className="rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                Every invoice is settled. Nothing is waiting for payment.
            </p>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Invoice" error={errors.invoice_id}>
                <select
                    className={inputClass}
                    value={data.invoice_id}
                    onChange={(e) => {
                        const id = e.target.value === '' ? '' : Number(e.target.value);
                        const chosen = invoices.find((i) => i.id === id);
                        setData((d) => ({ ...d, invoice_id: id, amount: chosen ? String(chosen.balance) : '' }));
                    }}
                >
                    <option value="">Choose an unpaid invoice…</option>
                    {invoices.map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.number} · {i.patient} · {formatMoney(i.balance, true)} due
                        </option>
                    ))}
                </select>
            </Field>

            {invoice && (
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-jubilee-ink">
                    <span className="font-semibold">{invoice.description}</span> for {invoice.patient}.{' '}
                    <span className="font-semibold text-jubilee-blue">{formatMoney(invoice.balance, true)}</span> still owed.
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (USD)" error={errors.amount}>
                    <input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={data.amount} onChange={(e) => setData('amount', e.target.value)} />
                </Field>
                <Field label="Method" error={errors.method}>
                    <select className={inputClass} value={data.method} onChange={(e) => setData('method', e.target.value)}>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="mobile_money">Mobile money</option>
                        <option value="bank_transfer">Bank transfer</option>
                    </select>
                </Field>
            </div>
            <Submit processing={processing}>Record payment</Submit>
        </form>
    );
}

export function PrescriptionForm({ options, onDone }: FormProps & { options: Options }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        patient_id: '' as number | '',
        medication: '',
        dosage: '',
        instructions: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('prescriptions.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <PatientPicker patients={options.patients} value={data.patient_id} onChange={(id) => setData('patient_id', id)} error={errors.patient_id} />
            <Field label="Medication" error={errors.medication}>
                <input className={inputClass} value={data.medication} onChange={(e) => setData('medication', e.target.value)} placeholder="e.g. Amoxicillin 500mg" />
            </Field>
            <Field label="Dosage" error={errors.dosage}>
                <input className={inputClass} value={data.dosage} onChange={(e) => setData('dosage', e.target.value)} placeholder="e.g. 1 tablet, 3 times daily" />
            </Field>
            <Field label="Instructions" error={errors.instructions}>
                <textarea className={inputClass} rows={3} value={data.instructions} onChange={(e) => setData('instructions', e.target.value)} />
            </Field>
            <Submit processing={processing}>Create prescription</Submit>
        </form>
    );
}
