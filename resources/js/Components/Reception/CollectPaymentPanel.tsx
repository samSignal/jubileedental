import BookFlow from '@/Components/Clinic/BookFlow';
import { ApiError, http, parseError } from '@/Components/Clinic/api';
import { CheckCircleIcon, PlusIcon, TrashIcon } from '@/Components/Dashboard/DashboardIcons';
import { formatMoney } from '@/Components/Dashboard/ui';
import { Appt, Billing, BillingLine, DentistLite, ServiceItem } from '@/types/clinic';
import { useMemo, useState } from 'react';

const METHODS: [string, string][] = [
    ['cash', 'Cash'],
    ['card', 'Card'],
    ['mobile_money', 'Mobile money'],
    ['bank_transfer', 'Transfer'],
];

const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);

    return d.toLocaleDateString('en-CA');
};

const FOLLOW_UPS: [string, number][] = [
    ['In 2 weeks', 14],
    ['In 1 month', 30],
    ['In 3 months', 91],
    ['In 6 months', 182],
];

/**
 * The cashier's moment: the services the dentist recorded, the amount and method,
 * and then the next visit, all on the same patient visit.
 */
export default function CollectPaymentPanel({
    visit,
    services,
    dentists,
    onPaid,
    onClose,
}: {
    visit: Appt & { billing: Billing };
    services: ServiceItem[];
    dentists: DentistLite[];
    onPaid: () => void;
    onClose: () => void;
}) {
    const locked = visit.billing.paid > 0 || visit.billing.invoice_number !== null && visit.billing.paid > 0;
    const [lines, setLines] = useState<BillingLine[]>(visit.billing.lines);
    const [method, setMethod] = useState('cash');
    const total = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0), [lines]);
    const due = locked ? visit.billing.balance : Math.round(total * 100) / 100;
    const [amount, setAmount] = useState(String(due));
    const [error, setError] = useState<ApiError | null>(null);
    const [saving, setSaving] = useState(false);
    const [receipt, setReceipt] = useState<{ invoice_number: string; amount: number; method: string; balance: number } | null>(null);
    const [booking, setBooking] = useState<{ date: string } | null>(null);
    const [booked, setBooked] = useState<Appt | null>(null);

    const setLine = (i: number, patch: Partial<BillingLine>) => {
        const next = lines.map((l, k) => (k === i ? { ...l, ...patch } : l));
        setLines(next);
        setAmount(String(Math.round(next.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100));
    };

    const addService = (id: number) => {
        const s = services.find((x) => x.id === id);
        if (!s) return;

        const next = [...lines, { service_id: s.id, description: s.name, quantity: 1, unit_price: s.price }];
        setLines(next);
        setAmount(String(Math.round(next.reduce((sum, l) => sum + l.quantity * l.unit_price, 0) * 100) / 100));
    };

    const pay = async () => {
        setSaving(true);
        setError(null);

        try {
            const { data } = await http.post<{ receipt: NonNullable<typeof receipt> }>(route('appointments.pay', visit.id), {
                amount: Number(amount),
                method,
                lines: locked ? undefined : lines,
            });
            setReceipt(data.receipt);
            onPaid();
        } catch (err) {
            setError(parseError(err));
        } finally {
            setSaving(false);
        }
    };

    if (booking) {
        return booked ? (
            <div className="space-y-4 motion-safe:animate-pop-in">
                <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
                    <CheckCircleIcon className="h-5 w-5" />
                    Booked for {new Date(booked.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} at {booked.time}
                </p>
                <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-jubilee-blue font-semibold text-white">
                    Done
                </button>
            </div>
        ) : (
            <BookFlow
                dentists={dentists}
                patient={{ id: visit.patient_id, name: visit.patient }}
                defaultDate={booking.date}
                defaultProcedure="Follow-up"
                defaultDentistId={visit.dentist_id}
                onBooked={setBooked}
            />
        );
    }

    if (receipt) {
        return (
            <div className="space-y-5 motion-safe:animate-pop-in">
                <div className="rounded-3xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white">
                        <CheckCircleIcon className="h-8 w-8" />
                    </span>
                    <p className="mt-3 font-display text-3xl font-extrabold text-emerald-900">{formatMoney(receipt.amount, true)}</p>
                    <p className="text-sm text-emerald-800">
                        {receipt.method} · Invoice {receipt.invoice_number}
                    </p>
                    {receipt.balance > 0 && (
                        <p className="mt-2 text-sm font-semibold text-amber-800">{formatMoney(receipt.balance, true)} still owed</p>
                    )}
                </div>

                <div>
                    <h3 className="mb-2 text-sm font-semibold">Book the next visit?</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {FOLLOW_UPS.map(([label, days]) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setBooking({ date: addDays(days) })}
                                className="rounded-xl bg-[#f2f6fc] px-3 py-3 text-sm font-semibold transition hover:bg-blue-100"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="button" onClick={onClose} className="h-12 w-full rounded-xl px-4 text-sm font-semibold text-jubilee-muted ring-1 ring-slate-200 hover:bg-slate-50">
                    No follow-up needed
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {error.message}
                </p>
            )}

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Services this visit</h3>
                    {visit.billing.invoice_number && <span className="text-xs text-jubilee-muted">Invoice {visit.billing.invoice_number}</span>}
                </div>

                {lines.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[#cfdcf0] px-4 py-5 text-center text-sm text-jubilee-muted">
                        The dentist did not record any services. Add them below.
                    </p>
                )}

                <ul className="space-y-2">
                    {lines.map((l, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-xl border border-[#e6edf7] p-2">
                            <input
                                value={l.description}
                                disabled={locked}
                                onChange={(e) => setLine(i, { description: e.target.value })}
                                aria-label="Service"
                                className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-jubilee-blue/20 disabled:text-jubilee-ink"
                            />
                            <input
                                type="number"
                                min={1}
                                value={l.quantity}
                                disabled={locked}
                                onChange={(e) => setLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                                aria-label="Quantity"
                                className="w-14 rounded-lg border-[#e6edf7] px-2 py-1.5 text-center text-sm disabled:bg-slate-50"
                            />
                            <span className="text-sm text-jubilee-muted">×</span>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={l.unit_price}
                                disabled={locked}
                                onChange={(e) => setLine(i, { unit_price: Number(e.target.value) || 0 })}
                                aria-label="Price"
                                className="w-24 rounded-lg border-[#e6edf7] px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                            {!locked && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = lines.filter((_, k) => k !== i);
                                        setLines(next);
                                        setAmount(String(Math.round(next.reduce((s, x) => s + x.quantity * x.unit_price, 0) * 100) / 100));
                                    }}
                                    aria-label="Remove line"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>

                {!locked && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <select
                            value=""
                            onChange={(e) => e.target.value && addService(Number(e.target.value))}
                            aria-label="Add a service"
                            className="rounded-xl border-[#cfdcf0] py-2 pl-3 pr-9 text-sm focus:border-jubilee-blue focus:ring-jubilee-blue/20"
                        >
                            <option value="">+ Add a service…</option>
                            {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} · {formatMoney(s.price)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setLines([...lines, { service_id: null, description: 'Other', quantity: 1, unit_price: 0 }])}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-jubilee-blue ring-1 ring-blue-200 hover:bg-blue-50"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Custom line
                        </button>
                    </div>
                )}
            </div>

            <div className="rounded-2xl bg-[#f7faff] p-4">
                <div className="flex items-baseline justify-between">
                    <span className="text-sm text-jubilee-muted">{locked ? 'Balance owed' : 'Total'}</span>
                    <span className="font-display text-2xl font-extrabold tabular-nums">{formatMoney(due, true)}</span>
                </div>
                {locked && (
                    <p className="mt-1 text-xs text-jubilee-muted">
                        {formatMoney(visit.billing.paid, true)} of {formatMoney(visit.billing.total, true)} already paid.
                    </p>
                )}
            </div>

            <div>
                <span className="mb-1.5 block text-sm font-semibold">Method</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {METHODS.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={method === value}
                            onClick={() => setMethod(value)}
                            className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
                                method === value ? 'bg-jubilee-blue text-white shadow-[0_8px_18px_-8px_rgba(23,105,224,0.8)]' : 'bg-[#f2f6fc] hover:bg-blue-100'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Amount received (USD)</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full rounded-xl border border-[#cfdcf0] px-4 py-3 text-lg font-semibold tabular-nums focus:border-jubilee-blue focus:ring-4 focus:ring-jubilee-blue/15"
                />
                {error?.fields.amount && <span className="mt-1.5 block text-sm text-red-600">{error.fields.amount}</span>}
            </label>

            <button
                type="button"
                onClick={pay}
                disabled={saving || (lines.length === 0 && !locked)}
                className="flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-base font-semibold text-white shadow-[0_12px_24px_-10px_rgba(5,150,105,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            >
                {saving ? 'Recording…' : `Record ${formatMoney(Number(amount) || 0, true)} payment`}
            </button>
        </div>
    );
}
