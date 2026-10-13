import { SVGAttributes } from 'react';

type P = SVGAttributes<SVGElement>;

function Base({ children, ...p }: P) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...p}
        >
            {children}
        </svg>
    );
}

export const HomeIcon = (p: P) => (
    <Base {...p}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </Base>
);

export const CalendarIcon = (p: P) => (
    <Base {...p}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 10h17" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </Base>
);

export const StethoscopeIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 3v6a4 4 0 0 0 8 0V3" />
        <path d="M10 13v2a5 5 0 0 0 10 0v-2" />
        <circle cx="20" cy="11" r="2" />
    </Base>
);

export const PillIcon = (p: P) => (
    <Base {...p}>
        <rect
            x="2.5"
            y="8.5"
            width="19"
            height="7"
            rx="3.5"
            transform="rotate(-45 12 12)"
        />
        <path d="M9 9l6 6" />
    </Base>
);

export const ReceiptIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
    </Base>
);

export const FileTextIcon = (p: P) => (
    <Base {...p}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Base>
);

export const BarsIcon = (p: P) => (
    <Base {...p}>
        <path d="M5 20V10M12 20V4M19 20v-7" />
    </Base>
);

export const SettingsIcon = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Base>
);

export const SearchIcon = (p: P) => (
    <Base {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </Base>
);

export const BellIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
    </Base>
);

export const ChevronDownIcon = (p: P) => (
    <Base {...p}>
        <path d="m6 9 6 6 6-6" />
    </Base>
);

export const ChevronRightIcon = (p: P) => (
    <Base {...p}>
        <path d="m9 6 6 6-6 6" />
    </Base>
);

export const ArrowRightIcon = (p: P) => (
    <Base {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </Base>
);

export const ArrowUpIcon = (p: P) => (
    <Base {...p}>
        <path d="M12 19V5M6 11l6-6 6 6" />
    </Base>
);

export const MenuIcon = (p: P) => (
    <Base {...p}>
        <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
);

export const CloseIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 6l12 12M18 6 6 18" />
    </Base>
);

export const LogoutIcon = (p: P) => (
    <Base {...p}>
        <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
        <path d="m16 17 5-5-5-5M21 12H9" />
    </Base>
);

export const UserPlusIcon = (p: P) => (
    <Base {...p}>
        <circle cx="10" cy="8" r="4" />
        <path d="M2.5 20c0-3.6 3.4-6 7.5-6" />
        <path d="M18 14v6M15 17h6" />
    </Base>
);

export const UserIcon = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Base>
);

export const UsersGroupIcon = (p: P) => (
    <Base {...p}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.7" />
    </Base>
);

export const CardIcon = (p: P) => (
    <Base {...p}>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M2.5 10h19M6.5 15h4" />
    </Base>
);

export const BellRingIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
        <path d="M10 19a2 2 0 0 0 4 0M3 6a9 9 0 0 1 2-3M21 6a9 9 0 0 0-2-3" />
    </Base>
);

export const SparklesIcon = (p: P) => (
    <Base {...p}>
        <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </Base>
);

export const ChevronsLeftIcon = (p: P) => (
    <Base {...p}>
        <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </Base>
);

export const ClockIcon = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </Base>
);

export const CommandIcon = (p: P) => (
    <Base {...p}>
        <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
    </Base>
);

export const AlertTriangleIcon = (p: P) => (
    <Base {...p}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
    </Base>
);

export const CheckCircleIcon = (p: P) => (
    <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
    </Base>
);

export const ShieldLockIcon = (p: P) => (
    <Base {...p}>
        <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M10.5 11V9.8a1.5 1.5 0 0 1 3 0V11" />
    </Base>
);

export const CheckIcon = (p: P) => (
    <Base {...p}>
        <path d="m5 12.5 4.5 4.5L19 7" />
    </Base>
);

export const KeyIcon = (p: P) => (
    <Base {...p}>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8M16 7l3 3M14 9l2 2" />
    </Base>
);

export const EditIcon = (p: P) => (
    <Base {...p}>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
    </Base>
);

export const CopyIcon = (p: P) => (
    <Base {...p}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </Base>
);

export const PlusIcon = (p: P) => (
    <Base {...p}>
        <path d="M12 5v14M5 12h14" />
    </Base>
);

export const TrashIcon = (p: P) => (
    <Base {...p}>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Base>
);

export const LockClosedIcon = (p: P) => (
    <Base {...p}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Base>
);

export const ClipboardIcon = (p: P) => (
    <Base {...p}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6H9V4.5ZM9 11h6M9 15h4" />
    </Base>
);

export const BellAlertIcon = (p: P) => (
    <Base {...p}>
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" />
        <path d="M10 19a2 2 0 0 0 4 0M12 2v1" />
    </Base>
);

export const TicketIcon = (p: P) => (
    <Base {...p}>
        <path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2Z" />
        <path d="M14 6v12" strokeDasharray="2 3" />
    </Base>
);
