import { SearchIcon, UserPlusIcon } from '@/Components/Dashboard/DashboardIcons';
import { Avatar } from '@/Components/Dashboard/ui';
import { PatientSummary } from '@/types/clinic';
import { http } from '@/Components/Clinic/api';
import { useEffect, useRef, useState } from 'react';

/**
 * Type-ahead patient search backed by the server (works with any number of
 * patients). Shows intake status and today's visits so the receptionist can see
 * at a glance whether someone is already expected.
 */
export default function PatientSearch({
    onSelect,
    onRegister,
    autoFocus = false,
}: {
    onSelect: (patient: PatientSummary) => void;
    onRegister?: (query: string) => void;
    autoFocus?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) input.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        const q = query.trim();

        if (q.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const id = window.setTimeout(async () => {
            try {
                const { data } = await http.get<{ patients: PatientSummary[] }>(route('patients.search'), {
                    params: { q },
                    signal: controller.signal,
                });
                setResults(data.patients);
                setSearched(true);
            } catch {
                /* superseded by a newer keystroke or offline */
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => {
            window.clearTimeout(id);
            controller.abort();
        };
    }, [query]);

    return (
        <div>
            <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-jubilee-hint" />
                <input
                    ref={input}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, phone or national ID…"
                    aria-label="Search patients"
                    autoComplete="off"
                    className="h-14 w-full rounded-2xl border border-[#cfdcf0] bg-white pl-12 pr-4 text-base placeholder:text-jubilee-hint focus:border-jubilee-blue focus:ring-4 focus:ring-jubilee-blue/15"
                />
                {loading && (
                    <span className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin rounded-full border-2 border-jubilee-blue border-t-transparent" />
                )}
            </div>

            {query.trim().length >= 2 && (
                <ul className="mt-3 space-y-2" aria-live="polite">
                    {results.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(p)}
                                className="group flex w-full items-center gap-3 rounded-2xl border border-[#e6edf7] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-jubilee-sky/60 hover:shadow-[0_14px_28px_-18px_rgba(23,105,224,0.5)]"
                            >
                                <Avatar name={p.name} size={44} />
                                <span className="min-w-0 flex-1 leading-tight">
                                    <span className="block truncate font-semibold">{p.name}</span>
                                    <span className="block truncate text-xs text-jubilee-muted">
                                        {p.phone ?? 'No phone'}
                                        {p.age !== null ? ` · ${p.age} yrs` : ''}
                                    </span>
                                    {p.today.length > 0 && (
                                        <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-semibold text-jubilee-blue">
                                            Today {p.today[0].time} · {p.today[0].procedure}
                                        </span>
                                    )}
                                </span>
                                <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
                                        p.intake.complete
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                    }`}
                                >
                                    {p.intake.complete ? 'Intake complete' : `${p.intake.missing.length} missing`}
                                </span>
                            </button>
                        </li>
                    ))}

                    {searched && results.length === 0 && (
                        <li className="rounded-2xl border border-dashed border-[#cfdcf0] px-4 py-6 text-center text-sm text-jubilee-muted">
                            No patient matches &ldquo;{query.trim()}&rdquo;.
                        </li>
                    )}

                    {searched && onRegister && (
                        <li>
                            <button
                                type="button"
                                onClick={() => onRegister(query.trim())}
                                className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] p-3 text-left text-white shadow-[0_12px_24px_-12px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5"
                            >
                                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20">
                                    <UserPlusIcon className="h-6 w-6" />
                                </span>
                                <span className="leading-tight">
                                    <span className="block font-semibold">Register a new patient</span>
                                    <span className="block text-xs text-white/80">Start a new record for &ldquo;{query.trim()}&rdquo;</span>
                                </span>
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
