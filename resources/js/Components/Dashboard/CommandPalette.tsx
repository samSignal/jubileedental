import {
    CalendarIcon,
    CardIcon,
    ClipboardIcon,
    FileTextIcon,
    HomeIcon,
    PillIcon,
    SearchIcon,
    UserPlusIcon,
    UsersGroupIcon,
} from '@/Components/Dashboard/DashboardIcons';
import { PageProps } from '@/types';
import { PanelKey, Permissions } from '@/types/clinic';
import { http } from '@/Components/Clinic/api';
import { router, usePage } from '@inertiajs/react';
import {
    ComponentType,
    KeyboardEvent,
    SVGAttributes,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

type Command = {
    id: string;
    label: string;
    hint?: string;
    group: 'Actions' | 'Go to' | 'Patients';
    Icon: ComponentType<SVGAttributes<SVGElement>>;
    run: () => void;
};

type PatientHit = { id: number; name: string; phone: string | null; age: number | null; intake: { complete: boolean } };

/** Ask the dashboard page to open one of its slide-over panels. */
function openPanel(panel: PanelKey) {
    window.dispatchEvent(new CustomEvent('jubilee:open-panel', { detail: { panel } }));
}

/**
 * Ctrl/Cmd+K launcher: run quick actions, jump around, or find any patient and
 * open their record. Everything it lists is permission-filtered.
 */
export default function CommandPalette({ onSoon }: { onSoon: (label: string) => void }) {
    const { can, auth } = usePage<PageProps<{ can?: Permissions }>>().props;
    const permissions = auth.user.permissions;
    const has = (p: string) => permissions.includes(p);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [hits, setHits] = useState<PatientHit[]>([]);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const toggle = () => setOpen((value) => !value);
        const onKey = (e: globalThis.KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((value) => !value);
            } else if (e.key === '/' && !typing) {
                e.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('jubilee:palette', toggle);
        document.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('jubilee:palette', toggle);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            setHits([]);
            window.setTimeout(() => input.current?.focus(), 30);
        }
    }, [open]);

    // Patient lookup runs on the server, so it works for any number of records.
    useEffect(() => {
        const q = query.trim();

        if (!open || q.length < 2 || !has('patients.view')) {
            setHits([]);
            return;
        }

        const controller = new AbortController();
        const id = window.setTimeout(async () => {
            try {
                const { data } = await http.get<{ patients: PatientHit[] }>(route('patients.search'), {
                    params: { q },
                    signal: controller.signal,
                });
                setHits(data.patients);
            } catch {
                /* superseded */
            }
        }, 200);

        return () => {
            window.clearTimeout(id);
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, open]);

    const commands = useMemo<Command[]>(() => {
        const list: Command[] = [];
        const go = (fn: () => void) => () => {
            setOpen(false);
            fn();
        };
        const onDashboard = typeof route === 'function' && route().current('dashboard');
        const panel = (key: PanelKey) =>
            onDashboard ? go(() => openPanel(key)) : go(() => router.visit(route('dashboard')));

        if (has('appointments.queue')) list.push({ id: 'desk', label: 'Open the front desk', hint: 'Check patients in and manage the queue', group: 'Actions', Icon: ClipboardIcon, run: go(() => router.visit(route('frontdesk.index'))) });
        if (can?.recordPayment) list.push({ id: 'pay', label: 'Record a payment', hint: 'Receive money against an invoice', group: 'Actions', Icon: CardIcon, run: panel('payment') });
        if (can?.bookAppointment) list.push({ id: 'book', label: 'Book an appointment', hint: 'Choose a patient and a time', group: 'Actions', Icon: CalendarIcon, run: go(() => router.visit(route('appointments.index'))) });
        if (can?.createPatient || has('patients.create')) list.push({ id: 'patient', label: 'Register a new patient', hint: 'Add someone to the clinic', group: 'Actions', Icon: UserPlusIcon, run: go(() => router.visit(route('patients.index'))) });
        if (can?.addInvoice) list.push({ id: 'invoice', label: 'Create an invoice', hint: 'Bill a patient for treatment', group: 'Actions', Icon: FileTextIcon, run: panel('invoice') });
        if (can?.prescribe) list.push({ id: 'rx', label: 'Write a prescription', hint: 'Prescribe medication', group: 'Actions', Icon: PillIcon, run: panel('prescription') });

        list.push({ id: 'home', label: 'Dashboard', group: 'Go to', Icon: HomeIcon, run: go(() => router.visit(route('dashboard'))) });
        if (has('patients.view')) list.push({ id: 'patients', label: 'Patients', hint: 'Search and open records', group: 'Go to', Icon: UsersGroupIcon, run: go(() => router.visit(route('patients.index'))) });
        if (has('appointments.view')) list.push({ id: 'appts', label: 'Appointments', hint: "Today's diary by dentist", group: 'Go to', Icon: CalendarIcon, run: go(() => router.visit(route('appointments.index'))) });
        if (has('reports.view')) list.push({ id: 'reports', label: 'Reports', hint: 'Coming soon', group: 'Go to', Icon: FileTextIcon, run: go(() => onSoon('Reports')) });

        const q = query.trim().toLowerCase();

        hits.forEach((p) =>
            list.push({
                id: `patient-${p.id}`,
                label: p.name,
                hint: [p.phone, p.age !== null ? `${p.age} yrs` : null, p.intake.complete ? null : 'Intake incomplete'].filter(Boolean).join(' · '),
                group: 'Patients',
                Icon: UsersGroupIcon,
                run: go(() => router.visit(route('patients.show', p.id))),
            }),
        );

        return q
            ? list.filter((c) => c.group === 'Patients' || `${c.label} ${c.hint ?? ''}`.toLowerCase().includes(q))
            : list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [can, permissions, hits, query, onSoon]);

    useEffect(() => setActive(0), [query, hits.length]);

    if (!open) return null;

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(commands.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commands[active]?.run();
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    let lastGroup = '';

    return (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[12vh]">
            <button
                type="button"
                aria-label="Close search"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px] motion-safe:animate-fade-in"
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-20px_rgba(11,42,111,0.5)] ring-1 ring-[#e6edf7] motion-safe:animate-pop-in"
            >
                <div className="flex items-center gap-3 border-b border-[#eef3fa] px-4">
                    <SearchIcon className="h-5 w-5 shrink-0 text-jubilee-hint" />
                    <input
                        ref={input}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Type a command or a patient's name or phone…"
                        aria-label="Search"
                        className="h-14 w-full border-0 bg-transparent text-base text-jubilee-ink placeholder:text-jubilee-hint focus:ring-0"
                    />
                    <kbd className="rounded-md border border-[#dbe5f3] px-1.5 py-0.5 text-xs text-jubilee-muted">Esc</kbd>
                </div>

                <ul role="listbox" className="max-h-[22rem] overflow-y-auto p-2">
                    {commands.length === 0 && (
                        <li className="px-3 py-8 text-center text-sm text-jubilee-muted">Nothing matches &ldquo;{query}&rdquo;.</li>
                    )}
                    {commands.map((c, i) => {
                        const header = c.group !== lastGroup;
                        lastGroup = c.group;

                        return (
                            <li key={c.id} role="presentation">
                                {header && (
                                    <p className="px-3 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-jubilee-hint">
                                        {c.group}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={i === active}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={c.run}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === active ? 'bg-blue-50' : ''}`}
                                >
                                    <span
                                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                                            i === active ? 'bg-jubilee-blue text-white' : 'bg-[#f2f6fc] text-jubilee-muted'
                                        }`}
                                    >
                                        <c.Icon className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0 flex-1 leading-tight">
                                        <span className="block truncate text-sm font-semibold">{c.label}</span>
                                        {c.hint && <span className="block truncate text-xs text-jubilee-muted">{c.hint}</span>}
                                    </span>
                                    {i === active && (
                                        <kbd className="rounded-md border border-[#dbe5f3] bg-white px-1.5 py-0.5 text-xs text-jubilee-muted">↵</kbd>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
