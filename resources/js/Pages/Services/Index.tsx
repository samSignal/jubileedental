import { Field, inputClass } from '@/Components/Admin/fields';
import { PlusIcon } from '@/Components/Dashboard/DashboardIcons';
import { cardClass, formatMoney } from '@/Components/Dashboard/ui';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode, useState } from 'react';

type Service = { id: number; name: string; price: number; is_active: boolean };

function Row({ service }: { service: Service }) {
    const [name, setName] = useState(service.name);
    const [price, setPrice] = useState(String(service.price));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dirty = name !== service.name || Number(price) !== service.price;

    const save = (patch: Partial<{ is_active: boolean }> = {}) => {
        router.patch(route('services.update', service.id), { name, price, is_active: service.is_active, ...patch }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onError: (e) => setError(e.name ?? e.price ?? 'Could not save.'),
            onSuccess: () => setError(null),
        });
    };

    return (
        <li className={`flex flex-wrap items-center gap-3 border-t border-[#eef3fa] px-5 py-3 first:border-t-0 ${service.is_active ? '' : 'opacity-60'}`}>
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Service name" className="min-w-0 flex-1 rounded-lg border-[#e6edf7] px-3 py-2 text-sm font-medium focus:border-jubilee-blue focus:ring-jubilee-blue/20" />
            <span className="flex items-center gap-1 text-sm text-jubilee-muted">
                $
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price" className="w-28 rounded-lg border-[#e6edf7] px-3 py-2 text-sm font-semibold tabular-nums focus:border-jubilee-blue focus:ring-jubilee-blue/20" />
            </span>
            {error && <span className="basis-full text-xs text-red-600">{error}</span>}
            <span className="flex gap-2">
                {dirty && (
                    <button type="button" disabled={saving} onClick={() => save()} className="rounded-lg bg-jubilee-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                        Save
                    </button>
                )}
                <button type="button" onClick={() => save({ is_active: !service.is_active })} className="rounded-lg px-3 py-2 text-xs font-semibold text-jubilee-muted ring-1 ring-slate-200 hover:bg-slate-50">
                    {service.is_active ? 'Hide' : 'Show'}
                </button>
            </span>
        </li>
    );
}

export default function ServicesIndex({ services }: PageProps<{ services: Service[] }>) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', price: '' });

    const add = (e: FormEvent) => {
        e.preventDefault();
        post(route('services.store'), { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <>
            <Head title="Services & prices" />

            <div className="mx-auto max-w-[760px] space-y-6">
                <header>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Services &amp; prices</h1>
                    <p className="mt-1 text-jubilee-muted">
                        The price list dentists tick from when finishing a visit and reception bills against. Hidden services stay on past invoices.
                    </p>
                </header>

                <section className={cardClass}>
                    <ul>
                        {services.length === 0 && <li className="px-5 py-10 text-center text-jubilee-muted">No services yet.</li>}
                        {services.map((s) => (
                            <Row key={`${s.id}-${s.name}-${s.price}-${s.is_active}`} service={s} />
                        ))}
                    </ul>
                </section>

                <form onSubmit={add} className={`${cardClass} p-5`} noValidate>
                    <h2 className="font-display text-lg font-bold">Add a service</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
                        <Field label="Name" error={errors.name}>
                            <input className={inputClass} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        </Field>
                        <Field label="Price (USD)" error={errors.price}>
                            <input className={inputClass} type="number" min="0" step="0.01" value={data.price} onChange={(e) => setData('price', e.target.value)} />
                        </Field>
                        <button type="submit" disabled={processing} className="flex h-[3.1rem] items-center justify-center gap-2 rounded-xl bg-jubilee-blue px-5 font-semibold text-white disabled:opacity-60">
                            <PlusIcon className="h-5 w-5" />
                            Add
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-jubilee-hint">Example price today: {formatMoney(45)} for a cleaning.</p>
                </form>
            </div>
        </>
    );
}

ServicesIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
