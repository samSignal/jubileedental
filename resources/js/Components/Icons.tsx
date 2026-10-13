import { SVGAttributes } from 'react';

type IconProps = SVGAttributes<SVGElement>;

function Icon({ children, ...props }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export const UserIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
);

export const LockIcon = (p: IconProps) => (
    <Icon {...p}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
);

export const EyeIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M17.9 17.9A10 10 0 0 1 12 19C5.5 19 2 12 2 12a17 17 0 0 1 4.1-5.1M9.9 5.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </Icon>
);

export const LoginIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
        <path d="M10 17l5-5-5-5M15 12H3" />
    </Icon>
);

export const ShieldCheckIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
    </Icon>
);

export const UsersIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.7" />
    </Icon>
);

export const ChartIcon = (p: IconProps) => (
    <Icon {...p}>
        <rect x="3" y="13" width="4" height="8" rx="1" />
        <rect x="10" y="8" width="4" height="13" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
    </Icon>
);

export const ToothIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M12 4.2C10.2 2.6 6 2.6 5 6.5c-.7 2.8 1 5 1.4 7.6.4 3 .7 7.4 2.5 7.4s1.9-4.4 3.1-4.4 1.3 4.4 3.1 4.4 2.1-4.4 2.5-7.4c.4-2.6 2.100-4.800 1.400-7.600C18 2.600 13.800 2.600 12 4.200Z" />
    </Icon>
);

export const AlertIcon =(p: IconProps) => (
    <Icon {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.5h.01" />
    </Icon>
);

export const SpinnerIcon = (p: IconProps) => (
    <Icon {...p} className={`animate-spin ${p.className ?? ''}`}>
        <path d="M12 3a9 9 0 1 0 9 9" />
    </Icon>
);

export const ShieldIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z" />
    </Icon>
);

export const SunIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
);

export const MoonIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </Icon>
);

/** Four-point sparkle used for decorative twinkles. */
export const SparkleIcon = (p: SVGAttributes<SVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
        <path d="M12 0c.8 6.4 3.6 9.2 12 12-8.4 2.8-11.2 5.6-12 12-.8-6.4-3.6-9.2-12-12 8.4-2.8 11.2-5.6 12-12Z" />
    </svg>
);
