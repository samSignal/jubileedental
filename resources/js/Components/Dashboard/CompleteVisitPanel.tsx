import { ApiError, http, parseError } from '@/Components/Clinic/api';
import { PlusIcon, TrashIcon } from '@/Components/Dashboard/DashboardIcons';
import { formatMoney } from '@/Components/Dashboard/ui';
import { BillingLine, ServiceItem } from '@/types/clinic';
import { useMemo, useState } from 'react';

/**
 * The dentist finishes a visit by ticking what was done. Reception then bills
 * exactly this, so nothing has to be re-typed at the desk. Recording services is
 * optional: "Finish" with nothing ticked simply closes the visit.
 */
export default function CompleteVisitPanel({
    appointmentId,
    patient,
    services,
    onDone,
}: {
    appointmentId: number;
    patient: string;
    services: ServiceItem[];
    onDone: () => void;
}) {
    const [lines, setLines] = useState<BillingLine[]>([]);
    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);
    const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), [lines]);

    const toggle = (s: ServiceItem) => {
        setLines((current) =>
            current.some((l) => l.service_id === s.id)
                ? current.filter((l) => l.service_id !== s.id)
                : [...current, { service_id: s.id, description: s.name, quantity: 1, unit_price: s.price }],
        );
    };

    const finish = async () => {
        setSaving(true);
        setError(null);

        try {
            await http.post(route('appointments.complete', appointmentId), { services: lines });
            onDone();
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm">
                What was done for <span className="font-semibold">{patient}</span>? Reception will bill this and take payment.
            </p>

            {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {error.message}
                </p>
            )}

            <div className="grid grid-cols-2 gap-2">
                {services.map((s) => {
                    const on = lines.some((l) => l.service_id === s.id);

                    return (
                        <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(s)}
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                                on ? 'border-jubilee-blue bg-blue-50 shadow-[0_8px_18px_-12px_rgba(23,105,224,0.8)]' : 'border-[#e6edf7] hover:border-jubilee-sky/60'
                            }`}
                        >
                            <span className="block text-sm font-semibold">{s.name}</span>
                            <span className="block text-xs text-jubilee-muted">{formatMoney(s.price)}</span>
                        </button>
                    );
                })}
            </div>

            {lines.length > 0 && (
                <ul className="space-y-2">
                    {lines.map((l, i) => (
                        <li key={`${l.service_id ?? 'x'}-${i}`} className="flex items-center gap-3 rounded-xl border border-[#e6edf7] px-3 py-2">
                            <span className="flex-1 text-sm font-medium">{l.description}</span>
                            <input
                                type="number"
                                min={1}
                                value={l.quantity}
                                aria-label={`${l.description} quantity`}
                                onChange={(e) =>
                                    setLines(lines.map((x, k) => (k === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))
                                }
                                className="w-16 rounded-lg border-[#e6edf7] px-2 py-1 text-center text-sm"
                            />
                            <span className="w-16 text-right text-sm tabular-nums">{formatMoney(l.quantity * l.unit_price)}</span>
                            <button
                                type="button"
                                aria-label={`Remove ${l.description}`}
                                onClick={() => setLines(lines.filter((_, k) => k !== i))}
                                className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={() => setLines([...lines, { service_id: null, description: 'Other treatment', quantity: 1, unit_price: 0 }])}
                className="flex items-center gap-1.5 text-sm font-semibold text-jubilee-blue hover:underline"
            >
                <PlusIcon className="h-4 w-4" />
                Add something not on the list
            </button>

            <div className="flex items-baseline justify-between rounded-2xl bg-[#f7faff] px-4 py-3">
                <span className="text-sm text-jubilee-muted">Total for the visit</span>
                <span className="font-display text-xl font-extrabold tabular-nums">{formatMoney(total, true)}</span>
            </div>

            <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] text-base font-semibold text-white shadow-[0_12px_24px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
                {saving ? 'Finishing…' : lines.length ? 'Finish visit and send to reception' : 'Finish visit'}
            </button>
        </div>
    );
}
