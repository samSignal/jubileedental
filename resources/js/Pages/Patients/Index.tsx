import RegisterPatientForm from '@/Components/Clinic/RegisterPatientForm';
import {
    AlertTriangleIcon,
    ChevronRightIcon,
    SearchIcon,
    UserPlusIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { Avatar, cardClass } from '@/Components/Dashboard/ui';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

type Row = {
    id: number;
    name: string;
    phone: string | null;
    age: number | null;
    gender: string | null;
    missing_count: number;
    last_visit: string | null;
    next_visit: string | null;
};

type Props = PageProps<{
    q: string;
    patients: { data: Row[]; page: number; last_page: number; total: number; per_page: number };
}>;

export default function PatientsIndex({ q, patients, auth }: Props) {
    const [query, setQuery] = useState(q);
    const [registering, setRegistering] = useState(false);
    const first = useRef(true);
    const canCreate = auth.user.permissions.includes('patients.create');

    // Debounced server-side search.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }

        const id = window.setTimeout(() => {
            router.get(route('patients.index'), query.trim() ? { q: query.trim() } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['patients', 'q'],
            });
        }, 300);

        return () => window.clearTimeout(id);
    }, [query]);

    const go = (page: number) =>
        router.get(route('patients.index'), { q: query.trim() || undefined, page }, { preserveState: true, preserveScroll: true, only: ['patients', 'q'] });

    return (
        <>
            <Head title="Patients" />

            <div className="mx-auto max-w-[1200px] space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Patients</h1>
                        <p className="mt-1 text-jubilee-muted">{patients.total} {patients.total === 1 ? 'patient' : 'patients'}{q ? ` matching “${q}”` : ' on record'}.</p>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => setRegistering(true)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5"
                        >
                            <UserPlusIcon className="h-5 w-5" />
                            Register patient
                        </button>
                    )}
                </header>

                <section className={`${cardClass} overflow-hidden`}>
                    <div className="border-b border-[#eef3fa] p-4">
                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-jubilee-hint" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, phone or national ID…"
                                aria-label="Search patients"
                                className="h-12 w-full rounded-xl border border-[#dbe5f3] bg-[#f7faff] pl-11 pr-4 text-sm placeholder:text-jubilee-hint focus:border-jubilee-blue focus:bg-white focus:ring-4 focus:ring-jubilee-blue/10"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="bg-[#f7faff] text-xs text-jubilee-muted">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Patient</th>
                                    <th className="px-5 py-3 font-medium">Phone</th>
                                    <th className="px-5 py-3 font-medium">Intake</th>
                                    <th className="px-5 py-3 font-medium">Last visit</th>
                                    <th className="px-5 py-3 font-medium">Next visit</th>
                                    <th className="w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {patients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-jubilee-muted">
                                            {q ? 'No patients match that search.' : 'No patients yet. Register the first one.'}
                                        </td>
                                    </tr>
                                )}
                                {patients.data.map((p) => (
                                    <tr key={p.id} className="group border-t border-[#eef3fa] transition-colors hover:bg-blue-50/40">
                                        <td className="px-5 py-3.5">
                                            <Link href={route('patients.show', p.id)} className="flex items-center gap-3">
                                                <Avatar name={p.name} size={40} />
                                                <span className="leading-tight">
                                                    <span className="block font-semibold group-hover:text-jubilee-blue">{p.name}</span>
                                                    <span className="block text-xs text-jubilee-muted">
                                                        {[p.age !== null ? `${p.age} yrs` : null, p.gender].filter(Boolean).join(' · ') || '—'}
                                                    </span>
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-jubilee-muted">{p.phone ?? '—'}</td>
                                        <td className="px-5 py-3.5">
                                            {p.missing_count === 0 ? (
                                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Complete</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                                                    {p.missing_count} missing
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-jubilee-muted">{p.last_visit ?? '—'}</td>
                                        <td className="whitespace-nowrap px-5 py-3.5">{p.next_visit ?? '—'}</td>
                                        <td className="pr-4">
                                            <ChevronRightIcon className="h-4 w-4 text-jubilee-hint transition-transform group-hover:translate-x-1 group-hover:text-jubilee-blue" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {patients.last_page > 1 && (
                        <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-[#eef3fa] px-5 py-3 text-sm">
                            <span className="text-jubilee-muted">
                                Page {patients.page} of {patients.last_page}
                            </span>
                            <span className="flex gap-2">
                                <button type="button" disabled={patients.page <= 1} onClick={() => go(patients.page - 1)} className="rounded-lg px-3 py-1.5 font-semibold ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40">
                                    Previous
                                </button>
                                <button type="button" disabled={patients.page >= patients.last_page} onClick={() => go(patients.page + 1)} className="rounded-lg px-3 py-1.5 font-semibold ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40">
                                    Next
                                </button>
                            </span>
                        </nav>
                    )}
                </section>
            </div>

            <SlideOver open={registering} title="Register patient" subtitle="Just the basics. Intake and consent come next." onClose={() => setRegistering(false)}>
                <RegisterPatientForm
                    onCreated={(p) => {
                        setRegistering(false);
                        router.visit(route('patients.show', p.id));
                    }}
                />
            </SlideOver>
        </>
    );
}

PatientsIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
