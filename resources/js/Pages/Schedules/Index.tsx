import { Avatar, cardClass } from '@/Components/Dashboard/ui';
import { PlusIcon, TrashIcon } from '@/Components/Dashboard/DashboardIcons';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

type Block = { weekday: number; start: string; end: string };
type Dentist = { id: number; name: string; blocks: Block[] };

type Props = PageProps<{ dentists: Dentist[] }>;

// Monday first, as most clinics think of the week.
const DAYS: [number, string][] = [
    [1, 'Monday'],
    [2, 'Tuesday'],
    [3, 'Wednesday'],
    [4, 'Thursday'],
    [5, 'Friday'],
    [6, 'Saturday'],
    [0, 'Sunday'],
];

const PRESETS: { label: string; blocks: Block[] }[] = [
    {
        label: 'Mon–Fri, 8 to 5',
        blocks: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: '08:00', end: '17:00' })),
    },
    {
        label: 'Mon–Fri with lunch + Sat morning',
        blocks: [
            ...[1, 2, 3, 4, 5].flatMap((weekday) => [
                { weekday, start: '08:00', end: '13:00' },
                { weekday, start: '14:00', end: '17:00' },
            ]),
            { weekday: 6, start: '08:00', end: '12:00' },
        ],
    },
];

function Editor({ dentist }: { dentist: Dentist }) {
    const [blocks, setBlocks] = useState<Block[]>(dentist.blocks);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);

    const update = (next: Block[]) => {
        setBlocks(next);
        setDirty(true);
    };

    const save = () => {
        router.put(route('schedules.update', dentist.id), { blocks }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: () => {
                setDirty(false);
                setErrors({});
            },
            onError: (e) => setErrors(e),
        });
    };

    const input = 'w-[7.2rem] rounded-lg border-[#cfdcf0] px-2 py-1.5 text-sm focus:border-jubilee-blue focus:ring-jubilee-blue/20';

    return (
        <section className={`${cardClass} p-5 sm:p-6`}>
            <header className="flex flex-wrap items-center gap-3">
                <Avatar name={dentist.name} size={48} />
                <div className="mr-auto leading-tight">
                    <h2 className="font-display text-lg font-bold">{dentist.name}</h2>
                    <p className="text-xs text-jubilee-muted">
                        {blocks.length === 0 ? 'No hours set: bookable at any time' : 'Bookings are limited to these hours'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                        <button key={p.label} type="button" onClick={() => update(p.blocks)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-jubilee-blue transition hover:bg-blue-100">
                            {p.label}
                        </button>
                    ))}
                </div>
            </header>

            <ul className="mt-5 divide-y divide-[#eef3fa]">
                {DAYS.map(([weekday, name]) => {
                    const day = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.weekday === weekday);

                    return (
                        <li key={weekday} className="flex flex-wrap items-start gap-3 py-3">
                            <span className="w-28 shrink-0 pt-1.5 text-sm font-semibold">{name}</span>
                            <div className="min-w-0 flex-1 space-y-2">
                                {day.length === 0 && <p className="pt-1.5 text-sm text-jubilee-hint">Off</p>}
                                {day.map(({ b, i }) => (
                                    <div key={i} className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="time"
                                            aria-label={`${name} start`}
                                            value={b.start}
                                            className={input}
                                            onChange={(e) => update(blocks.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))}
                                        />
                                        <span className="text-jubilee-muted">to</span>
                                        <input
                                            type="time"
                                            aria-label={`${name} end`}
                                            value={b.end}
                                            className={input}
                                            onChange={(e) => update(blocks.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))}
                                        />
                                        <button
                                            type="button"
                                            aria-label={`Remove ${name} block`}
                                            onClick={() => update(blocks.filter((_, k) => k !== i))}
                                            className="grid h-9 w-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => update([...blocks, { weekday, start: day.length ? '14:00' : '08:00', end: day.length ? '17:00' : '17:00' }])}
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-jubilee-blue ring-1 ring-blue-200 transition hover:bg-blue-50"
                            >
                                <PlusIcon className="h-4 w-4" />
                                {day.length ? 'Add break' : 'Add hours'}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {errors.blocks && (
                <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {errors.blocks}
                </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
                {dirty && <span className="text-sm text-amber-700">Unsaved changes</span>}
                <button
                    type="button"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save hours'}
                </button>
            </div>
        </section>
    );
}

export default function SchedulesIndex({ dentists }: Props) {
    return (
        <>
            <Head title="Dentist hours" />

            <div className="mx-auto max-w-[1000px] space-y-6">
                <header>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Dentist hours</h1>
                    <p className="mt-1 text-jubilee-muted">
                        Set when each dentist works. Reception can only book inside these hours, and double-booking is prevented.
                    </p>
                </header>

                {dentists.length === 0 ? (
                    <p className={`${cardClass} p-8 text-center text-jubilee-muted`}>
                        No one has a role that can treat patients yet. Add a dentist under Users first.
                    </p>
                ) : (
                    dentists.map((d) => <Editor key={d.id} dentist={d} />)
                )}
            </div>
        </>
    );
}

SchedulesIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
