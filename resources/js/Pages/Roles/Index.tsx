import { Field, SubmitButton, inputClass } from '@/Components/Admin/fields';
import {
    CheckIcon,
    LockClosedIcon,
    PlusIcon,
    ShieldLockIcon,
    TrashIcon,
    UsersGroupIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { cardClass } from '@/Components/Dashboard/ui';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

type RoleRow = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_system: boolean;
    is_locked: boolean;
    is_own: boolean;
    users_count: number;
    permissions: string[];
};

type Group = { group: string; items: { value: string; label: string }[] };

type Props = PageProps<{ roles: RoleRow[]; catalogue: Group[]; selectedId: number | null }>;

function Switch({
    checked,
    onChange,
    disabled,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/25 disabled:cursor-not-allowed ${
                checked ? (disabled ? 'bg-blue-300' : 'bg-jubilee-blue') : 'bg-slate-200'
            }`}
        >
            <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    checked ? 'translate-x-5' : ''
                }`}
            />
        </button>
    );
}

function PermissionEditor({ catalogue, value, onChange, locked }: {
    catalogue: Group[];
    value: string[];
    onChange: (next: string[]) => void;
    locked: boolean;
}) {
    const set = new Set(value);

    const toggle = (permission: string, on: boolean) => {
        const next = new Set(set);
        on ? next.add(permission) : next.delete(permission);
        onChange([...next]);
    };

    const setGroup = (group: Group, on: boolean) => {
        const next = new Set(set);
        group.items.forEach((i) => (on ? next.add(i.value) : next.delete(i.value)));
        onChange([...next]);
    };

    return (
        <div className="space-y-5">
            {catalogue.map((group) => {
                const granted = group.items.filter((i) => set.has(i.value)).length;
                const all = granted === group.items.length;

                return (
                    <fieldset key={group.group} className="rounded-2xl border border-[#e6edf7]">
                        <legend className="sr-only">{group.group}</legend>
                        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-[#f7faff] px-4 py-3">
                            <p className="text-sm font-semibold">
                                {group.group}
                                <span className="ml-2 text-xs font-normal text-jubilee-muted">
                                    {granted} of {group.items.length}
                                </span>
                            </p>
                            {!locked && (
                                <button
                                    type="button"
                                    onClick={() => setGroup(group, !all)}
                                    className="text-xs font-semibold text-jubilee-blue hover:underline"
                                >
                                    {all ? 'Clear all' : 'Select all'}
                                </button>
                            )}
                        </div>
                        <ul>
                            {group.items.map((item) => (
                                <li
                                    key={item.value}
                                    className="flex items-center justify-between gap-4 border-t border-[#eef3fa] px-4 py-3"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm">{item.label}</span>
                                        <span className="block font-mono text-[0.68rem] text-jubilee-hint">{item.value}</span>
                                    </span>
                                    <Switch
                                        checked={set.has(item.value)}
                                        disabled={locked}
                                        onChange={(on) => toggle(item.value, on)}
                                        label={item.label}
                                    />
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                );
            })}
        </div>
    );
}

function RoleEditor({ role, catalogue }: { role: RoleRow; catalogue: Group[] }) {
    const { data, setData, patch, processing, errors, isDirty, reset } = useForm({
        name: role.name,
        description: role.description ?? '',
        permissions: role.permissions,
    });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        patch(route('roles.update', role.id), { preserveScroll: true });
    };

    const remove = () => {
        router.delete(route('roles.destroy', role.id), {
            preserveScroll: true,
            onError: (errs) => {
                setDeleteError(errs.role ?? 'This role could not be deleted.');
                setConfirmDelete(false);
            },
        });
    };

    const total = catalogue.reduce((n, g) => n + g.items.length, 0);

    return (
        <form onSubmit={submit} className="space-y-6" noValidate>
            {role.is_locked && (
                <div className="flex items-start gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200">
                    <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                        <span className="font-semibold">{role.name} always has full access.</span> This role is the safety net that
                        keeps the system manageable, so it cannot be edited or removed.
                    </p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role name" error={errors.name}>
                    <input
                        className={inputClass}
                        value={data.name}
                        disabled={role.is_locked}
                        onChange={(e) => setData('name', e.target.value)}
                    />
                </Field>
                <Field label="Description" error={errors.description}>
                    <input
                        className={inputClass}
                        value={data.description}
                        disabled={role.is_locked}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="What is this role for?"
                    />
                </Field>
            </div>

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-base font-bold">Permissions</h3>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-jubilee-blue">
                        {role.is_locked ? total : data.permissions.length} of {total} granted
                    </span>
                </div>
                {errors.permissions && (
                    <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                        {errors.permissions}
                    </p>
                )}
                <PermissionEditor
                    catalogue={catalogue}
                    value={role.is_locked ? catalogue.flatMap((g) => g.items.map((i) => i.value)) : data.permissions}
                    onChange={(next) => setData('permissions', next)}
                    locked={role.is_locked}
                />
            </div>

            {!role.is_locked && (
                <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_18px_40px_-16px_rgba(11,42,111,0.35)] ring-1 ring-[#e6edf7] backdrop-blur sm:flex-row sm:items-center">
                    <p className="flex-1 px-1 text-sm text-jubilee-muted">
                        {isDirty
                            ? 'You have unsaved changes. They apply to everyone in this role as soon as you save.'
                            : `${role.users_count} ${role.users_count === 1 ? 'person has' : 'people have'} this role.`}
                    </p>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="rounded-xl px-4 py-3 text-sm font-semibold text-jubilee-muted ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            Discard
                        </button>
                    )}
                    <SubmitButton processing={processing} className="!h-12 sm:!w-auto sm:px-8">
                        Save changes
                    </SubmitButton>
                </div>
            )}

            {!role.is_system && (
                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
                    <h3 className="text-sm font-semibold text-red-900">Delete this role</h3>
                    <p className="mt-1 text-sm text-red-800/80">
                        {role.users_count > 0
                            ? `${role.users_count} ${role.users_count === 1 ? 'person still has' : 'people still have'} this role. Move them to another role first.`
                            : 'No one has this role, so it can be removed safely.'}
                    </p>
                    {deleteError && (
                        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                            {deleteError}
                        </p>
                    )}
                    <div className="mt-3 flex gap-2">
                        {confirmDelete ? (
                            <>
                                <button
                                    type="button"
                                    onClick={remove}
                                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                                >
                                    Yes, delete {role.name}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
                                >
                                    Keep it
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                disabled={role.users_count > 0}
                                onClick={() => setConfirmDelete(true)}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <TrashIcon className="h-4 w-4" />
                                Delete role
                            </button>
                        )}
                    </div>
                </div>
            )}
        </form>
    );
}

function NewRoleForm({ roles, catalogue, onDone }: { roles: RoleRow[]; catalogue: Group[]; onDone: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
        permissions: [] as string[],
    });
    const [template, setTemplate] = useState<number | ''>('');

    const pickTemplate = (id: number | '') => {
        setTemplate(id);
        const source = roles.find((r) => r.id === id);
        setData('permissions', source ? source.permissions : []);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('roles.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setTemplate('');
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Role name" error={errors.name}>
                <input className={inputClass} value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Dental Nurse" autoComplete="off" />
            </Field>
            <Field label="Description" error={errors.description}>
                <input className={inputClass} value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="What is this role for?" />
            </Field>
            <Field label="Start from" hint="Copy the permissions of an existing role, then adjust them after creating.">
                <select className={inputClass} value={template} onChange={(e) => pickTemplate(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">Nothing (no permissions)</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
            </Field>
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-jubilee-ink">
                {data.permissions.length} of {catalogue.reduce((n, g) => n + g.items.length, 0)} permissions will be granted.
            </p>
            <SubmitButton processing={processing}>Create role</SubmitButton>
        </form>
    );
}

export default function RolesIndex({ roles, catalogue, selectedId }: Props) {
    const [current, setCurrent] = useState<number | null>(selectedId ?? roles[0]?.id ?? null);
    const [creating, setCreating] = useState(false);
    const close = useCallback(() => setCreating(false), []);

    // Jump to a freshly created role.
    useEffect(() => {
        if (selectedId) setCurrent(selectedId);
    }, [selectedId]);

    const role = roles.find((r) => r.id === current) ?? roles[0];
    const total = useMemo(() => catalogue.reduce((n, g) => n + g.items.length, 0), [catalogue]);

    return (
        <>
            <Head title="Roles & permissions" />

            <div className="mx-auto max-w-[1200px] space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Roles &amp; permissions</h1>
                        <p className="mt-1 text-jubilee-muted">
                            Create roles and choose exactly what each one can do. Changes apply to everyone in the role immediately.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5"
                    >
                        <PlusIcon className="h-5 w-5" />
                        New role
                    </button>
                </header>

                <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <nav aria-label="Roles" className="space-y-2">
                        {roles.map((r) => {
                            const active = r.id === role?.id;

                            return (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setCurrent(r.id)}
                                    aria-current={active ? 'true' : undefined}
                                    className={`w-full rounded-2xl p-4 text-left transition-all duration-200 ${
                                        active
                                            ? 'bg-white shadow-[0_16px_32px_-18px_rgba(23,105,224,0.55)] ring-2 ring-jubilee-blue'
                                            : `${cardClass} hover:-translate-y-0.5`
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="font-semibold">{r.name}</span>
                                        {r.is_locked && <LockClosedIcon className="h-4 w-4 text-violet-500" aria-label="Locked" />}
                                        {r.is_system && !r.is_locked && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                                                Built-in
                                            </span>
                                        )}
                                    </span>
                                    {r.description && (
                                        <span className="mt-1 line-clamp-2 block text-xs text-jubilee-muted">{r.description}</span>
                                    )}
                                    <span className="mt-3 flex items-center gap-4 text-xs text-jubilee-muted">
                                        <span className="flex items-center gap-1.5">
                                            <UsersGroupIcon className="h-4 w-4" />
                                            {r.users_count}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <ShieldLockIcon className="h-4 w-4" />
                                            {r.permissions.length}/{total}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <section aria-label="Role editor" className={`${cardClass} p-5 sm:p-6`}>
                        {role ? (
                            <>
                                <div className="mb-5 flex items-center gap-3">
                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                                        <ShieldLockIcon className="h-6 w-6" />
                                    </span>
                                    <div>
                                        <h2 className="font-display text-lg font-bold tracking-tight">{role.name}</h2>
                                        <p className="text-sm text-jubilee-muted">
                                            {role.users_count} {role.users_count === 1 ? 'person' : 'people'} in this role
                                        </p>
                                    </div>
                                </div>
                                <RoleEditor key={role.id} role={role} catalogue={catalogue} />
                            </>
                        ) : (
                            <p className="text-jubilee-muted">No roles yet.</p>
                        )}
                    </section>
                </div>

                <section aria-label="Role comparison" className={`${cardClass} p-5 sm:p-6`}>
                    <h2 className="font-display text-lg font-bold tracking-tight">Compare roles</h2>
                    <p className="text-sm text-jubilee-muted">A quick side-by-side of every permission.</p>

                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="text-left text-xs text-jubilee-muted">
                                    <th className="py-2 pr-4 font-medium">Permission</th>
                                    {roles.map((r) => (
                                        <th key={r.id} className="px-3 py-2 text-center font-semibold text-jubilee-ink">
                                            {r.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {catalogue.flatMap((g) => g.items).map((p) => (
                                    <tr key={p.value} className="border-t border-[#eef3fa]">
                                        <td className="py-2.5 pr-4">{p.label}</td>
                                        {roles.map((r) => (
                                            <td key={r.id} className="px-3 py-2.5 text-center">
                                                {r.permissions.includes(p.value) ? (
                                                    <CheckIcon className="mx-auto h-5 w-5 text-emerald-600" aria-label="Allowed" />
                                                ) : (
                                                    <span className="text-slate-300" aria-label="Not allowed">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <SlideOver open={creating} title="New role" subtitle="Name it, then fine-tune its permissions." onClose={close}>
                <NewRoleForm roles={roles} catalogue={catalogue} onDone={close} />
            </SlideOver>
        </>
    );
}

RolesIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
