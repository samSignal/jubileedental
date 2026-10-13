import { Field, inputClass } from '@/Components/Admin/fields';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import { PatientSummary } from '@/types/clinic';
import { FormEvent, useState } from 'react';

/** Quick registration: just enough to create the record, intake follows. */
export default function RegisterPatientForm({
    initialName = '',
    onCreated,
    onCancel,
}: {
    initialName?: string;
    onCreated: (patient: PatientSummary) => void;
    onCancel?: () => void;
}) {
    const looksLikePhone = /^[+\d][\d\s-]{5,}$/.test(initialName);
    const [form, setForm] = useState({
        name: looksLikePhone ? '' : initialName,
        phone: looksLikePhone ? initialName : '',
        date_of_birth: '',
        gender: '',
    });
    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);

    const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const { data } = await http.post<{ patient: PatientSummary }>(route('patients.store'), form);
            onCreated(data.patient);
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            {error && !Object.keys(error.fields).length && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                    {error.message}
                </p>
            )}
            <Field label="Full name" error={error?.fields.name}>
                <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus autoComplete="off" />
            </Field>
            <Field label="Phone" error={error?.fields.phone}>
                <input className={inputClass} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+263 77 123 4567" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Date of birth" error={error?.fields.date_of_birth}>
                    <input className={inputClass} type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                </Field>
                <Field label="Gender" error={error?.fields.gender}>
                    <select className={inputClass} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                        <option value="">Not specified</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                    </select>
                </Field>
            </div>
            <div className="flex gap-3">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="rounded-xl px-5 py-3 text-sm font-semibold text-jubilee-muted ring-1 ring-slate-200 hover:bg-slate-50">
                        Back
                    </button>
                )}
                <button
                    type="submit"
                    disabled={saving}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:opacity-70"
                >
                    {saving ? 'Registering…' : 'Register and continue'}
                </button>
            </div>
        </form>
    );
}
