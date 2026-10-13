import { Field, SubmitButton, inputClass } from '@/Components/Admin/fields';
import {
    CheckIcon,
    CopyIcon,
    EditIcon,
    KeyIcon,
    SearchIcon,
    UserPlusIcon,
} from '@/Components/Dashboard/DashboardIcons';
import SlideOver from '@/Components/Dashboard/SlideOver';
import { Avatar, cardClass, relativeTime } from '@/Components/Dashboard/ui';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, ReactNode, useCallback, useMemo, useState } from 'react';

type Member = {
    id: number;
    name: string;
    username: string;
    email: string;
    role_id: number | null;
    role_name: string;
    is_active: boolean;
    is_self: boolean;
    must_change_password: boolean;
    last_login_at: string | null;
    last_login_ip: string | null;
};

type RoleOption = { id: number; name: string; description: string | null };

type Props = PageProps<{ users: Member[]; roles: RoleOption[] }>;

/** 14 characters from an unambiguous alphabet, guaranteed to satisfy the password policy. */
function generatePassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const random = (n: number) => {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);

        return buffer[0] % n;
    };
    const pick = (set: string) => set[random(set.length)];

    const chars = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digits), pick(digits)];
    while (chars.length < 14) chars.push(pick(all));

    for (let i = chars.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

function PasswordField({
    value,
    onChange,
    error,
    label = 'Temporary password',
}: {
    value: string;
    onChange: (v: string) => void;
    error?: string;
    label?: string;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable: the value is visible to read out instead */
        }
    };

    return (
        <Field
            label={label}
            error={error}
            hint="At least 10 characters with upper and lower case letters and a number. They will be asked to change it at first sign-in."
        >
            <div className="flex gap-2">
                <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputClass} font-mono`}
                />
                <button
                    type="button"
                    onClick={() => onChange(generatePassword())}
                    className="shrink-0 rounded-xl bg-blue-50 px-4 text-sm font-semibold text-jubilee-blue transition hover:bg-blue-100"
                >
                    Generate
                </button>
                <button
                    type="button"
                    onClick={copy}
                    disabled={!value}
                    aria-label="Copy password"
                    className="grid w-12 shrink-0 place-items-center rounded-xl border border-[#cfdcf0] text-jubilee-muted transition hover:bg-blue-50 disabled:opacity-40"
                >
                    {copied ? <CheckIcon className="h-5 w-5 text-emerald-600" /> : <CopyIcon className="h-5 w-5" />}
                </button>
            </div>
        </Field>
    );
}

function RoleSelect({
    value,
    onChange,
    roles,
    error,
    disabled,
}: {
    value: number | '';
    onChange: (id: number) => void;
    roles: RoleOption[];
    error?: string;
    disabled?: boolean;
}) {
    const current = roles.find((r) => r.id === value);

    return (
        <Field label="Role" error={error} hint={disabled ? 'You cannot change your own role.' : current?.description ?? undefined}>
            <select
                className={inputClass}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                {value === '' && <option value="">Choose a role…</option>}
                {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                        {r.name}
                    </option>
                ))}
            </select>
        </Field>
    );
}

function AddMemberForm({ roles, onDone }: { roles: RoleOption[]; onDone: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        username: '',
        email: '',
        role_id: '' as number | '',
        password: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full name" error={errors.name}>
                <input className={inputClass} value={data.name} onChange={(e) => setData('name', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Username" error={errors.username} hint="Lowercase letters, numbers, dots or dashes. Used to sign in.">
                <input className={inputClass} value={data.username} onChange={(e) => setData('username', e.target.value.toLowerCase())} autoComplete="off" autoCapitalize="none" />
            </Field>
            <Field label="Email" error={errors.email}>
                <input className={inputClass} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <RoleSelect value={data.role_id} onChange={(id) => setData('role_id', id)} roles={roles} error={errors.role_id} />
            <PasswordField value={data.password} onChange={(v) => setData('password', v)} error={errors.password} />
            <SubmitButton processing={processing} className="mt-2">Create account</SubmitButton>
        </form>
    );
}

function EditMemberForm({ member, roles, onDone }: { member: Member; roles: RoleOption[]; onDone: () => void }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: member.name,
        email: member.email,
        role_id: (member.role_id ?? '') as number | '',
        is_active: member.is_active,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        patch(route('users.update', member.id), { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Full name" error={errors.name}>
                <input className={inputClass} value={data.name} onChange={(e) => setData('name', e.target.value)} />
            </Field>
            <Field label="Username" hint="Usernames cannot be changed.">
                <input className={`${inputClass} bg-slate-50`} value={member.username} disabled />
            </Field>
            <Field label="Email" error={errors.email}>
                <input className={inputClass} type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <RoleSelect value={data.role_id} onChange={(id) => setData('role_id', id)} roles={roles} error={errors.role_id} disabled={member.is_self} />

            <label className={`flex items-start gap-3 rounded-xl border border-[#e6edf7] p-4 ${member.is_self ? 'opacity-60' : 'cursor-pointer'}`}>
                <input
                    type="checkbox"
                    checked={data.is_active}
                    disabled={member.is_self}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-[#cfdcf0] text-jubilee-blue focus:ring-jubilee-blue/30"
                />
                <span>
                    <span className="block text-sm font-semibold">Account is active</span>
                    <span className="block text-xs text-jubilee-muted">
                        Turning this off signs them out immediately and blocks sign-in. Their records are kept.
                    </span>
                </span>
            </label>

            <SubmitButton processing={processing}>Save changes</SubmitButton>
        </form>
    );
}

function ResetPasswordForm({ member, onDone }: { member: Member; onDone: () => void }) {
    const { data, setData, put, processing, errors, reset } = useForm({ password: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(route('users.password', member.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onDone();
            },
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                {member.name} will be signed out everywhere and must choose a new password the next time they sign in.
            </p>
            <PasswordField label="New temporary password" value={data.password} onChange={(v) => setData('password', v)} error={errors.password} />
            <SubmitButton processing={processing}>Reset password</SubmitButton>
        </form>
    );
}

export default function UsersIndex({ users, roles, auth }: Props) {
    const [panel, setPanel] = useState<'add' | 'edit' | 'reset' | null>(null);
    const [selected, setSelected] = useState<Member | null>(null);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const close = useCallback(() => setPanel(null), []);
    const openFor = (kind: 'edit' | 'reset', member: Member) => {
        setSelected(member);
        setPanel(kind);
    };

    const canManageRoles = auth.user.permissions.includes('roles.manage');

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return users.filter((u) => {
            if (roleFilter !== 'all' && u.role_id !== roleFilter) return false;
            if (statusFilter === 'active' && !u.is_active) return false;
            if (statusFilter === 'inactive' && u.is_active) return false;

            return !q || `${u.name} ${u.username} ${u.email}`.toLowerCase().includes(q);
        });
    }, [users, query, roleFilter, statusFilter]);

    const activeCount = users.filter((u) => u.is_active).length;

    return (
        <>
            <Head title="Users" />

            <div className="mx-auto max-w-[1200px] space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Users</h1>
                        <p className="mt-1 text-jubilee-muted">
                            {users.length} {users.length === 1 ? 'person' : 'people'}, {activeCount} active. Roles decide what each
                            person can do
                            {canManageRoles && (
                                <>
                                    {' '}
                                    (<Link href={route('roles.index')} className="font-medium text-jubilee-blue hover:underline">manage roles</Link>)
                                </>
                            )}
                            .
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPanel('add')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5"
                    >
                        <UserPlusIcon className="h-5 w-5" />
                        Add user
                    </button>
                </header>

                <section aria-label="Users" className={`${cardClass} overflow-hidden`}>
                    <div className="flex flex-col gap-3 border-b border-[#eef3fa] p-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-jubilee-hint" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by name, username or email…"
                                aria-label="Search users"
                                className="h-11 w-full rounded-xl border border-[#dbe5f3] bg-[#f7faff] pl-11 pr-4 text-sm placeholder:text-jubilee-hint focus:border-jubilee-blue focus:bg-white focus:ring-4 focus:ring-jubilee-blue/10"
                            />
                        </div>
                        <select
                            aria-label="Filter by role"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="h-11 rounded-xl border-[#dbe5f3] bg-[#f7faff] pl-3 pr-9 text-sm focus:border-jubilee-blue focus:ring-jubilee-blue/20"
                        >
                            <option value="all">All roles</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="h-11 rounded-xl border-[#dbe5f3] bg-[#f7faff] pl-3 pr-9 text-sm focus:border-jubilee-blue focus:ring-jubilee-blue/20"
                        >
                            <option value="all">Any status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Deactivated</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-[#f7faff] text-xs text-jubilee-muted">
                                <tr>
                                    <th className="px-5 py-3 font-medium">User</th>
                                    <th className="px-5 py-3 font-medium">Role</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Last sign-in</th>
                                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-jubilee-muted">
                                            No users match those filters.
                                        </td>
                                    </tr>
                                )}
                                {visible.map((u) => (
                                    <tr key={u.id} className="border-t border-[#eef3fa] transition-colors hover:bg-blue-50/40">
                                        <td className="px-5 py-4">
                                            <span className="flex items-center gap-3">
                                                <Avatar name={u.name} size={40} />
                                                <span className="leading-tight">
                                                    <span className="block font-semibold">
                                                        {u.name}
                                                        {u.is_self && (
                                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                                                                You
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="block text-xs text-jubilee-muted">
                                                        @{u.username} · {u.email}
                                                    </span>
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-jubilee-blue ring-1 ring-blue-200">
                                                {u.role_name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="flex flex-wrap gap-1.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                    }`}
                                                >
                                                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {u.is_active ? 'Active' : 'Deactivated'}
                                                </span>
                                                {u.must_change_password && (
                                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                        Password change pending
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-jubilee-muted" title={u.last_login_ip ?? undefined}>
                                            {u.last_login_at ? relativeTime(u.last_login_at) : 'Never'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openFor('edit', u)}
                                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-jubilee-blue ring-1 ring-blue-200 transition hover:bg-blue-50"
                                                >
                                                    <EditIcon className="h-4 w-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openFor('reset', u)}
                                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                >
                                                    <KeyIcon className="h-4 w-4" />
                                                    Reset password
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <SlideOver open={panel === 'add'} title="Add user" subtitle="They will choose their own password at first sign-in." onClose={close}>
                <AddMemberForm roles={roles} onDone={close} />
            </SlideOver>
            <SlideOver open={panel === 'edit'} title="Edit user" subtitle={selected ? `@${selected.username}` : undefined} onClose={close}>
                {selected && <EditMemberForm key={selected.id} member={selected} roles={roles} onDone={close} />}
            </SlideOver>
            <SlideOver open={panel === 'reset'} title="Reset password" subtitle={selected?.name} onClose={close}>
                {selected && <ResetPasswordForm key={selected.id} member={selected} onDone={close} />}
            </SlideOver>
        </>
    );
}

UsersIndex.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
