import ApplicationLogo from '@/Components/ApplicationLogo';
import CommandPalette from '@/Components/Dashboard/CommandPalette';
import {
    BarsIcon,
    CalendarIcon,
    ChevronDownIcon,
    ClipboardIcon,
    ClockIcon,
    ChevronsLeftIcon,
    CloseIcon,
    CommandIcon,
    HomeIcon,
    LogoutIcon,
    MenuIcon,
    PillIcon,
    ReceiptIcon,
    SearchIcon,
    SettingsIcon,
    StethoscopeIcon,
    UserIcon,
    ShieldLockIcon,
    UsersGroupIcon,
} from '@/Components/Dashboard/DashboardIcons';
import NotificationsMenu, { ServerNotification } from '@/Components/Dashboard/NotificationsMenu';
import { Avatar } from '@/Components/Dashboard/ui';
import { PageProps } from '@/types';
import { ActivityItem, Outstanding, TimelineItem } from '@/types/clinic';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ComponentType,
    CSSProperties,
    PropsWithChildren,
    SVGAttributes,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

type Group = 'Overview' | 'Clinic' | 'Finance' | 'Admin';
type Badge = 'appointments' | 'invoices' | 'queue';

type NavItem = {
    label: string;
    Icon: ComponentType<SVGAttributes<SVGElement>>;
    /** Permission required to see the item; null means everyone. */
    permission: string | null;
    group: Group;
    badge?: Badge;
    /** Named route. Items without one show a "coming soon" toast. */
    route?: string;
    /** route().current() pattern that marks the item active. */
    match?: string;
};

/** Menu entries, shown only when the signed-in user holds the permission. */
const nav: NavItem[] = [
    { label: 'Dashboard', Icon: HomeIcon, permission: null, group: 'Overview', route: 'dashboard', match: 'dashboard' },
    { label: 'Reception', Icon: ClipboardIcon, permission: 'appointments.queue', group: 'Clinic', route: 'frontdesk.index', match: 'frontdesk.*', badge: 'queue' },
    { label: 'Patients', Icon: UsersGroupIcon, permission: 'patients.view', group: 'Clinic', route: 'patients.index', match: 'patients.*' },
    { label: 'Appointments', Icon: CalendarIcon, permission: 'appointments.view', group: 'Clinic', route: 'appointments.index', match: 'appointments.*', badge: 'appointments' },
    { label: 'Clinical', Icon: StethoscopeIcon, permission: 'clinical.view', group: 'Clinic' },
    { label: 'Prescriptions', Icon: PillIcon, permission: 'prescriptions.create', group: 'Clinic' },
    { label: 'Billing', Icon: ReceiptIcon, permission: 'finance.view', group: 'Finance', badge: 'invoices' },
    { label: 'Reports', Icon: BarsIcon, permission: 'reports.view', group: 'Finance' },
    { label: 'Users', Icon: UsersGroupIcon, permission: 'users.manage', group: 'Admin', route: 'users.index', match: 'users.*' },
    { label: 'Roles & permissions', Icon: ShieldLockIcon, permission: 'roles.manage', group: 'Admin', route: 'roles.index', match: 'roles.*' },
    { label: 'Services & prices', Icon: ReceiptIcon, permission: 'settings.manage', group: 'Admin', route: 'services.index', match: 'services.*' },
    { label: 'Dentist hours', Icon: ClockIcon, permission: 'schedules.manage', group: 'Admin', route: 'schedules.index', match: 'schedules.*' },
    { label: 'Settings', Icon: SettingsIcon, permission: 'settings.manage', group: 'Admin' },
];

const GROUP_ORDER: Group[] = ['Overview', 'Clinic', 'Finance', 'Admin'];
const SIDEBAR_KEY = 'jubilee:sidebar-collapsed';
const EXPANDED = 236;
const COLLAPSED = 78;

const ComingSoon = createContext<(label: string) => void>(() => undefined);
const ToastContext = createContext<(text: string) => void>(() => undefined);

/** Show a short confirmation or error message from anywhere inside the layout. */
export const useToast = () => useContext(ToastContext);

/** Call with a feature name to show the "coming soon" toast. */
export const useComingSoon = () => useContext(ComingSoon);

/** Progress ring for "how much of today's schedule is done". */
function DayRing({ done, total, compact }: { done: number; total: number; compact: boolean }) {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const radius = 18;
    const circumference = 2 * Math.PI * radius;

    return (
        <div
            className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 ${
                compact ? 'mx-auto h-12 w-12 justify-center' : 'p-3'
            }`}
            title={`${done} of ${total} appointments done today`}
        >
            <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden="true">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
                <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct / 100)}
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
                <defs>
                    <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#7cc4ff" />
                        <stop offset="1" stopColor="#2f9bff" />
                    </linearGradient>
                </defs>
            </svg>
            {!compact && (
                <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-semibold text-white">
                        {total === 0 ? 'No visits today' : `${done} of ${total} done`}
                    </span>
                    <span className="block text-[0.7rem] text-blue-100/70">
                        {total === 0 ? 'A quiet day so far' : `${pct}% of today's schedule`}
                    </span>
                </span>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }: PropsWithChildren) {
    const { auth, activity, flash, timeline, outstanding, notifications } = usePage<
        PageProps<{
            notifications?: { unread: number; items: ServerNotification[] } | null;
            activity?: ActivityItem[];
            flash?: { message?: string | null };
            timeline?: TimelineItem[];
            outstanding?: Outstanding;
        }>
    >().props;
    const user = auth.user;

    const [drawer, setDrawer] = useState(false);
    const [menu, setMenu] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return window.localStorage.getItem(SIDEBAR_KEY) === '1';
        } catch {
            return false;
        }
    });
    const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const toastTimer = useRef<number>();

    const show = useCallback((text: string) => {
        setToast(text);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 3200);
    }, []);

    const soon = useCallback((label: string) => show(`${label} is coming soon`), [show]);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((value) => {
            try {
                window.localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1');
            } catch {
                /* preference simply isn't remembered */
            }

            return !value;
        });
    }, []);

    // Confirmations from the server (e.g. "Payment of $30 recorded.").
    useEffect(() => {
        if (flash?.message) show(flash.message);
    }, [flash, show]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenu(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenu(false);
                setDrawer(false);
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleCollapsed();
            }
        };

        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [toggleCollapsed]);

    const openPalette = () => window.dispatchEvent(new CustomEvent('jubilee:palette'));

    // Front-desk staff land on Reception (mirrors the server's redirect), so a separate
    // "Dashboard" link would only point at the same screen.
    const homeIsReception =
        user.permissions.includes('appointments.queue') &&
        !user.permissions.includes('users.manage') &&
        !(user.permissions.includes('appointments.treat') && !user.permissions.includes('appointments.queue'));

    const items = nav.filter(
        (item) =>
            (item.permission === null || user.permissions.includes(item.permission)) &&
            !(homeIsReception && item.label === 'Dashboard'),
    );
    const groups = GROUP_ORDER.map((name) => ({
        name,
        items: items.filter((i) => i.group === name),
    })).filter((g) => g.items.length > 0);

    const roleLabel = user.role_label ?? 'Staff';

    const live = timeline ?? [];
    const countable = live.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show');
    const done = countable.filter((a) => a.status === 'completed').length;
    const openToday = countable.length - done;
    const badges: Record<Badge, number> = {
        appointments: openToday,
        invoices: outstanding?.count ?? 0,
        queue: countable.filter((a) => a.status === 'waiting').length,
    };

    const sidebarWidth = collapsed ? COLLAPSED : EXPANDED;

    const renderSidebar = (compact: boolean) => (
        <div className="flex h-full flex-col">
            <nav
                aria-label="Main"
                onMouseLeave={() => setPill(null)}
                className={`relative flex-1 px-3 pt-2 ${compact ? '' : 'overflow-y-auto'}`}
            >
                {/* sliding hover highlight */}
                <span
                    aria-hidden="true"
                    style={{ top: pill?.top ?? 0, height: pill?.height ?? 0, opacity: pill ? 1 : 0 }}
                    className="pointer-events-none absolute left-3 right-3 rounded-xl bg-white/10 transition-all duration-300 ease-out"
                />

                {groups.map((group, gi) => (
                    <div key={group.name}>
                        {compact ? (
                            gi > 0 && <div className="mx-3 my-3 h-px bg-white/10" />
                        ) : (
                            <p className="px-4 pb-1.5 pt-5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-blue-200/45">
                                {group.name}
                            </p>
                        )}

                        {group.items.map((item, i) => {
                            const { label, Icon, badge } = item;
                            const active = item.match ? Boolean(route().current(item.match)) : false;
                            const count = badge ? badges[badge] : 0;

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onMouseEnter={(e) =>
                                        setPill({ top: e.currentTarget.offsetTop, height: e.currentTarget.offsetHeight })
                                    }
                                    onFocus={(e) =>
                                        setPill({ top: e.currentTarget.offsetTop, height: e.currentTarget.offsetHeight })
                                    }
                                    onClick={() => {
                                        setDrawer(false);
                                        if (item.route) {
                                            if (!active) router.visit(route(item.route));
                                        } else {
                                            soon(label);
                                        }
                                    }}
                                    aria-current={active ? 'page' : undefined}
                                    aria-label={compact ? label : undefined}
                                    style={{ animationDelay: `${100 + (gi * 3 + i) * 45}ms` }}
                                    className={`group/item relative z-10 my-0.5 flex w-full items-center rounded-xl py-3 text-left text-[0.9rem] font-medium transition-colors duration-200 motion-safe:animate-fade-up ${
                                        compact ? 'justify-center px-0' : 'gap-3 px-3.5'
                                    } ${
                                        active
                                            ? 'bg-gradient-to-r from-jubilee-blue to-[#2b86f5] text-white shadow-[0_10px_20px_-10px_rgba(47,155,255,0.8)]'
                                            : 'text-blue-100/80 hover:text-white'
                                    }`}
                                >
                                    <span className="relative">
                                        <Icon
                                            className={`h-[1.35rem] w-[1.35rem] shrink-0 transition-transform duration-200 ${
                                                active ? '' : 'group-hover/item:scale-110'
                                            }`}
                                        />
                                        {compact && count > 0 && (
                                            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-[#0b2862]" />
                                        )}
                                    </span>

                                    {!compact && (
                                        <>
                                            <span className="flex-1 truncate">{label}</span>
                                            {count > 0 && (
                                                <span
                                                    className={`grid min-w-[1.4rem] place-items-center rounded-full px-1.5 py-0.5 text-[0.68rem] font-bold tabular-nums ${
                                                        active ? 'bg-white/25 text-white' : 'bg-rose-500/90 text-white'
                                                    }`}
                                                >
                                                    {count > 99 ? '99+' : count}
                                                </span>
                                            )}
                                        </>
                                    )}

                                    {compact && (
                                        <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-jubilee-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100">
                                            {label}
                                            {count > 0 ? ` · ${count}` : ''}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="space-y-3 p-3">
                {user.permissions.includes('appointments.view') && <DayRing done={done} total={countable.length} compact={compact} />}

                {!compact && (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                            <ApplicationLogo className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 leading-tight">
                            <span className="block text-sm font-semibold text-white">Jubilee Dental</span>
                            <span className="block text-[0.7rem] text-blue-100/70">
                                Your trusted dental care partner
                            </span>
                        </span>
                    </div>
                )}

                {/* collapse control: desktop sidebar only */}
                {!drawer && (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title="Toggle sidebar (Ctrl+B)"
                        className="hidden w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-blue-100/60 transition hover:bg-white/10 hover:text-white lg:flex"
                    >
                        <ChevronsLeftIcon
                            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
                        />
                        {!collapsed && 'Collapse'}
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <ComingSoon.Provider value={soon}>
            <ToastContext.Provider value={show}>
            <div
                style={{ '--sb': `${sidebarWidth}px` } as CSSProperties}
                className="min-h-screen bg-[#f2f6fc] bg-[radial-gradient(circle,#d5e1f2_1px,transparent_1.2px)] [background-size:24px_24px] font-sans text-jubilee-ink"
            >
                {/* Top bar */}
                <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-[#e6edf7] bg-white/90 px-3 backdrop-blur-md sm:h-20 sm:gap-6 sm:px-6">
                    <button
                        type="button"
                        onClick={() => setDrawer(true)}
                        aria-label="Open menu"
                        className="grid h-10 w-10 place-items-center rounded-xl text-jubilee-ink transition hover:bg-blue-50 lg:hidden"
                    >
                        <MenuIcon className="h-6 w-6" />
                    </button>

                    <Link
                        href={route('dashboard')}
                        className="flex shrink-0 items-center gap-3 overflow-hidden transition-[width] duration-300 lg:w-[calc(var(--sb)-18px)]"
                    >
                        <ApplicationLogo shine className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
                        <span className="hidden whitespace-nowrap leading-tight sm:block">
                            <span className="block font-display text-xl font-extrabold tracking-tight text-jubilee-ink">
                                Jubilee{' '}
                                <span className="bg-gradient-to-r from-jubilee-blue to-jubilee-sky bg-clip-text text-transparent">
                                    Dental
                                </span>
                            </span>
                            <span className="block whitespace-nowrap text-[0.66rem] font-medium text-jubilee-muted">
                                Healthy Smiles • Brighter Lives
                            </span>
                        </span>
                    </Link>

                    <button
                        type="button"
                        onClick={openPalette}
                        aria-label="Search or run a command"
                        className="group relative mx-auto hidden h-11 w-full max-w-[460px] items-center rounded-full border border-[#dbe5f3] bg-[#f4f8fd] pl-12 pr-4 text-left text-sm text-jubilee-hint transition hover:border-jubilee-sky/60 hover:bg-white md:flex"
                    >
                        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
                        <span className="flex-1 truncate">Search patients or run a command…</span>
                        <kbd className="ml-3 flex items-center gap-1 rounded-md border border-[#dbe5f3] bg-white px-1.5 py-0.5 text-xs text-jubilee-muted">
                            <CommandIcon className="h-3 w-3" />K
                        </kbd>
                    </button>

                    <div className="ml-auto flex items-center gap-1 sm:gap-3 md:ml-0">
                        <button
                            type="button"
                            onClick={openPalette}
                            aria-label="Search"
                            className="grid h-10 w-10 place-items-center rounded-xl text-jubilee-ink hover:bg-blue-50 md:hidden"
                        >
                            <SearchIcon className="h-5 w-5" />
                        </button>

                        <NotificationsMenu notifications={notifications ?? null} activity={activity ?? []} />

                        <span className="mx-1 hidden h-8 w-px bg-[#e6edf7] sm:block" />

                        <div ref={menuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setMenu((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={menu}
                                className="flex items-center gap-3 rounded-xl p-1 pr-2 transition hover:bg-blue-50 sm:pr-3"
                            >
                                <Avatar name={user.name} size={42} />
                                <span className="hidden text-left leading-tight sm:block">
                                    <span className="block text-sm font-semibold">{user.name}</span>
                                    <span className="block text-xs text-jubilee-muted">{roleLabel}</span>
                                </span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 text-jubilee-muted transition-transform ${menu ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {menu && (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_20px_40px_-14px_rgba(11,42,111,0.35)] ring-1 ring-[#e6edf7] motion-safe:animate-pop-in"
                                >
                                    <div className="px-3 py-2">
                                        <p className="truncate text-sm font-semibold">{user.name}</p>
                                        <p className="truncate text-xs text-jubilee-muted">{user.email}</p>
                                    </div>
                                    <Link
                                        href={route('profile.edit')}
                                        role="menuitem"
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-blue-50"
                                    >
                                        <UserIcon className="h-5 w-5 text-jubilee-muted" />
                                        My profile
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        role="menuitem"
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                    >
                                        <LogoutIcon className="h-5 w-5" />
                                        Log out
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Sidebar: fixed on desktop, drawer below lg */}
                <aside
                    style={{ width: sidebarWidth }}
                    className="fixed bottom-0 left-0 top-20 z-30 hidden bg-gradient-to-b from-[#0d2f74] via-[#0b2862] to-[#081d4a] transition-[width] duration-300 ease-out lg:block"
                >
                    {renderSidebar(collapsed)}
                </aside>

                {drawer && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() => setDrawer(false)}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in"
                        />
                        <aside className="absolute inset-y-0 left-0 w-[272px] bg-gradient-to-b from-[#0d2f74] via-[#0b2862] to-[#081d4a] shadow-2xl motion-safe:animate-fade-in">
                            <button
                                type="button"
                                onClick={() => setDrawer(false)}
                                aria-label="Close menu"
                                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10"
                            >
                                <CloseIcon className="h-5 w-5" />
                            </button>
                            <div className="h-full pt-10">{renderSidebar(false)}</div>
                        </aside>
                    </div>
                )}

                <main className="px-3 pb-10 pt-[5rem] transition-[padding] duration-300 sm:px-6 sm:pt-[6.5rem] lg:pl-[calc(var(--sb)+1.5rem)]">
                    {children}
                </main>

                <CommandPalette onSoon={soon} />

                {toast && (
                    <div
                        role="status"
                        className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-jubilee-ink px-5 py-3 text-sm font-medium text-white shadow-2xl motion-safe:animate-fade-up"
                    >
                        {toast}
                    </div>
                )}
            </div>
            </ToastContext.Provider>
        </ComingSoon.Provider>
    );
}
