import { Field, inputClass } from '@/Components/Admin/fields';
import { CheckCircleIcon, AlertTriangleIcon } from '@/Components/Dashboard/DashboardIcons';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import { PatientSummary } from '@/types/clinic';
import { FormEvent, PropsWithChildren, useMemo, useState } from 'react';

const CONDITIONS: [string, string][] = [
    ['diabetes', 'Diabetes'],
    ['hypertension', 'High blood pressure'],
    ['heart_disease', 'Heart disease'],
    ['asthma', 'Asthma'],
    ['epilepsy', 'Epilepsy'],
    ['bleeding_disorder', 'Bleeding disorder'],
    ['hiv', 'HIV'],
    ['hepatitis', 'Hepatitis'],
    ['tuberculosis', 'Tuberculosis'],
    ['kidney_disease', 'Kidney disease'],
    ['cancer', 'Cancer'],
];

function Section({
    title,
    done,
    children,
}: PropsWithChildren<{ title: string; done: boolean }>) {
    return (
        <fieldset className="rounded-2xl border border-[#e6edf7]">
            <legend className="sr-only">{title}</legend>
            <div className="flex items-center justify-between rounded-t-2xl bg-[#f7faff] px-4 py-3">
                <h3 className="text-sm font-semibold">{title}</h3>
                <span
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
                        done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                >
                    {done ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <AlertTriangleIcon className="h-3.5 w-3.5" />}
                    {done ? 'Complete' : 'Needs attention'}
                </span>
            </div>
            <div className="space-y-4 p-4">{children}</div>
        </fieldset>
    );
}

/**
 * Intake and consent in one form: contact and emergency details, medical
 * history and the signed consents. Anything still missing is flagged, and
 * saving returns the patient's refreshed intake status.
 */
export default function IntakeForm({
    patient,
    canReadHistory,
    onSaved,
    submitLabel = 'Save intake',
}: {
    patient: PatientSummary;
    canReadHistory: boolean;
    onSaved: (patient: PatientSummary) => void;
    submitLabel?: string;
}) {
    const details = patient.details;
    const history = patient.history;
    const missingKeys = useMemo(() => new Set(patient.intake.missing.map((m) => m.key)), [patient]);

    const [form, setForm] = useState({
        phone: details?.phone ?? '',
        date_of_birth: details?.date_of_birth ?? '',
        gender: details?.gender ?? '',
        address: details?.address ?? '',
        national_id: details?.national_id ?? '',
        emergency_contact_name: details?.emergency_contact_name ?? '',
        emergency_contact_phone: details?.emergency_contact_phone ?? '',
        emergency_contact_relationship: details?.emergency_contact_relationship ?? '',
        guardian_name: details?.guardian_name ?? '',
        guardian_phone: details?.guardian_phone ?? '',
        medical_aid_provider: details?.medical_aid_provider ?? '',
        medical_aid_number: details?.medical_aid_number ?? '',
    });

    const needHistory = !patient.history_recorded;
    const [editHistory, setEditHistory] = useState(needHistory || canReadHistory);
    const [med, setMed] = useState({
        allergies: history?.allergies ?? '',
        conditions: history?.conditions ?? ([] as string[]),
        other_conditions: history?.other_conditions ?? '',
        medications: history?.medications ?? '',
        is_pregnant: history?.is_pregnant ?? false,
        is_smoker: history?.is_smoker ?? false,
        last_dental_visit: history?.last_dental_visit ?? '',
        notes: history?.notes ?? '',
    });

    const consents = patient.consents ?? [];
    const [given, setGiven] = useState<Record<string, boolean>>({});
    const [signer, setSigner] = useState({
        name: patient.is_minor ? details?.guardian_name ?? '' : patient.name,
        relationship: patient.is_minor ? 'parent' : 'self',
    });

    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);

    const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
    const toggleCondition = (key: string) =>
        setMed((m) => ({
            ...m,
            conditions: m.conditions.includes(key) ? m.conditions.filter((c) => c !== key) : [...m.conditions, key],
        }));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload: Record<string, unknown> = { ...form };

        if (editHistory) {
            payload.medical_history = { ...med };
        }

        const signed = consents.filter((c) => !c.valid && given[c.type]);

        if (signed.length) {
            payload.consents = signed.map((c) => ({
                type: c.type,
                signed_by_name: signer.name,
                relationship: signer.relationship,
            }));
        }

        try {
            await http.put(route('patients.intake', patient.id), payload);
            const { data } = await http.get<{ patient: PatientSummary }>(route('patients.summary', patient.id));
            onSaved(data.patient);
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    const fieldError = (key: string) => error?.fields[key];
    const detailsDone = !['phone', 'date_of_birth', 'emergency_contact', 'guardian'].some((k) => missingKeys.has(k));
    const historyDone = !missingKeys.has('medical_history');
    const consentDone = ![...missingKeys].some((k) => k.startsWith('consent_'));
    const unsigned = consents.filter((c) => !c.valid);

    return (
        <form onSubmit={submit} className="space-y-5" noValidate>
            {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {error.message}
                </p>
            )}

            <Section title="Contact and emergency details" done={detailsDone}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" error={fieldError('phone')}>
                        <input className={inputClass} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                    </Field>
                    <Field label="Date of birth" error={fieldError('date_of_birth')}>
                        <input className={inputClass} type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
                    </Field>
                    <Field label="Address" error={fieldError('address')}>
                        <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
                    </Field>
                    <Field label="National ID" error={fieldError('national_id')}>
                        <input className={inputClass} value={form.national_id} onChange={(e) => set('national_id', e.target.value)} />
                    </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Emergency contact" error={fieldError('emergency_contact_name')}>
                        <input className={inputClass} value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
                    </Field>
                    <Field label="Their phone" error={fieldError('emergency_contact_phone')}>
                        <input className={inputClass} type="tel" value={form.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} />
                    </Field>
                    <Field label="Relationship" error={fieldError('emergency_contact_relationship')}>
                        <input className={inputClass} value={form.emergency_contact_relationship} onChange={(e) => set('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse" />
                    </Field>
                </div>

                {(patient.is_minor || form.guardian_name) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Parent or guardian" error={fieldError('guardian_name')} hint={patient.is_minor ? 'Required for patients under 18.' : undefined}>
                            <input className={inputClass} value={form.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} />
                        </Field>
                        <Field label="Guardian phone" error={fieldError('guardian_phone')}>
                            <input className={inputClass} type="tel" value={form.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} />
                        </Field>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Medical aid (optional)" error={fieldError('medical_aid_provider')}>
                        <input className={inputClass} value={form.medical_aid_provider} onChange={(e) => set('medical_aid_provider', e.target.value)} />
                    </Field>
                    <Field label="Member number" error={fieldError('medical_aid_number')}>
                        <input className={inputClass} value={form.medical_aid_number} onChange={(e) => set('medical_aid_number', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Medical history" done={historyDone && !needHistory ? true : false}>
                {!editHistory ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <span>
                            A medical history is on file{patient.history_updated ? ` (updated ${patient.history_updated})` : ''}.
                        </span>
                        <button
                            type="button"
                            onClick={() => setEditHistory(true)}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-jubilee-ink ring-1 ring-black/5"
                        >
                            Replace it
                        </button>
                    </div>
                ) : (
                    <>
                        <Field label="Allergies" error={fieldError('medical_history.allergies')} hint="Leave blank if none. Include medicines, latex, anaesthetics.">
                            <input className={inputClass} value={med.allergies} onChange={(e) => setMed({ ...med, allergies: e.target.value })} placeholder="e.g. Penicillin" />
                        </Field>

                        <div>
                            <span className="mb-1.5 block text-sm font-semibold">Conditions</span>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {CONDITIONS.map(([key, label]) => (
                                    <label
                                        key={key}
                                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                                            med.conditions.includes(key) ? 'border-jubilee-blue bg-blue-50' : 'border-[#e6edf7]'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={med.conditions.includes(key)}
                                            onChange={() => toggleCondition(key)}
                                            className="h-4 w-4 rounded border-[#cfdcf0] text-jubilee-blue focus:ring-jubilee-blue/30"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Other conditions" error={fieldError('medical_history.other_conditions')}>
                                <input className={inputClass} value={med.other_conditions} onChange={(e) => setMed({ ...med, other_conditions: e.target.value })} />
                            </Field>
                            <Field label="Current medication" error={fieldError('medical_history.medications')}>
                                <input className={inputClass} value={med.medications} onChange={(e) => setMed({ ...med, medications: e.target.value })} />
                            </Field>
                            <Field label="Last dental visit" error={fieldError('medical_history.last_dental_visit')}>
                                <input className={inputClass} type="date" value={med.last_dental_visit} onChange={(e) => setMed({ ...med, last_dental_visit: e.target.value })} />
                            </Field>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!med.is_smoker} onChange={(e) => setMed({ ...med, is_smoker: e.target.checked })} className="h-4 w-4 rounded border-[#cfdcf0] text-jubilee-blue" />
                                Smoker
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!med.is_pregnant} onChange={(e) => setMed({ ...med, is_pregnant: e.target.checked })} className="h-4 w-4 rounded border-[#cfdcf0] text-jubilee-blue" />
                                Pregnant
                            </label>
                        </div>
                    </>
                )}
            </Section>

            <Section title="Consent" done={consentDone}>
                {consents.map((c) => (
                    <div key={c.type} className={`rounded-xl border p-3 ${c.valid ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#e6edf7]'}`}>
                        {c.valid ? (
                            <p className="flex items-start gap-2 text-sm text-emerald-800">
                                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>
                                    <span className="font-semibold">{c.label}</span>
                                    <span className="block text-xs">
                                        Signed by {c.signed_by_name} on {c.on}
                                    </span>
                                </span>
                            </p>
                        ) : (
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={!!given[c.type]}
                                    onChange={(e) => setGiven({ ...given, [c.type]: e.target.checked })}
                                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#cfdcf0] text-jubilee-blue focus:ring-jubilee-blue/30"
                                />
                                <span>
                                    <span className="block text-sm font-semibold">
                                        {c.label}
                                        {c.required && <span className="ml-2 text-xs font-medium text-amber-700">Required</span>}
                                    </span>
                                    <span className="block text-xs text-jubilee-muted">{c.description}</span>
                                </span>
                            </label>
                        )}
                    </div>
                ))}

                {unsigned.some((c) => given[c.type]) && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Signed by (full name)" error={fieldError('consents.0.signed_by_name')}>
                            <input className={inputClass} value={signer.name} onChange={(e) => setSigner({ ...signer, name: e.target.value })} />
                        </Field>
                        <Field label="Relationship to patient">
                            <select className={inputClass} value={signer.relationship} onChange={(e) => setSigner({ ...signer, relationship: e.target.value })}>
                                <option value="self">The patient</option>
                                <option value="parent">Parent</option>
                                <option value="guardian">Legal guardian</option>
                            </select>
                        </Field>
                    </div>
                )}
            </Section>

            <button
                type="submit"
                disabled={saving}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:opacity-70"
            >
                {saving ? 'Saving…' : submitLabel}
            </button>
        </form>
    );
}
