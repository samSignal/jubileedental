import {
    ChartIcon,
    ShieldCheckIcon,
    ToothIcon,
    UsersIcon,
} from '@/Components/Icons';
import { ComponentType, SVGAttributes } from 'react';

type Feature = {
    title: string;
    caption: string;
    Icon: ComponentType<SVGAttributes<SVGElement>>;
};

const features: Feature[] = [
    {
        title: 'Secure Access',
        caption: 'Role-based sign-in for every team member',
        Icon: ShieldCheckIcon,
    },
    {
        title: 'Better Patient Care',
        caption: 'Every patient record, one tap away',
        Icon: UsersIcon,
    },
    {
        title: 'Efficient Workflow',
        caption: 'From check-in to checkout, effortlessly',
        Icon: ToothIcon,
    },
    {
        title: 'Trusted Reporting',
        caption: 'Clear daily insight into your clinic',
        Icon: ChartIcon,
    },
];

const themes = {
    dark: {
        card: 'border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-white/20 hover:border-white/30',
        icon: 'bg-gradient-to-br from-sky-300/40 to-blue-500/20 text-white ring-1 ring-white/25',
        caption: 'text-blue-100/80',
    },
    light: {
        card: 'border-jubilee-line bg-white/85 text-jubilee-ink shadow-[0_10px_24px_-14px_rgba(11,42,111,0.35)] hover:border-jubilee-sky/60',
        icon: 'bg-gradient-to-br from-sky-100 to-blue-100 text-jubilee-blue ring-1 ring-jubilee-line',
        caption: 'text-jubilee-muted',
    },
} as const;

function Cards({
    variant,
    hidden = false,
}: {
    variant: keyof typeof themes;
    hidden?: boolean;
}) {
    const theme = themes[variant];

    return (
        <ul
            aria-hidden={hidden || undefined}
            className="flex shrink-0 items-stretch gap-4 pr-4"
        >
            {features.map(({ title, caption, Icon }, i) => (
                <li
                    key={title}
                    className={`group/card flex w-[15.5rem] shrink-0 items-center gap-3.5 rounded-2xl border px-4 py-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${theme.card}`}
                >
                    <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform duration-500 group-hover/card:rotate-6 group-hover/card:scale-110 ${theme.icon}`}
                    >
                        <Icon
                            strokeWidth={1.5}
                            style={{ animationDelay: `${i * 0.7}s` }}
                            className="h-6 w-6 motion-safe:animate-bob"
                        />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-[0.95rem] font-semibold leading-tight">
                            {title}
                        </span>
                        <span
                            className={`mt-0.5 block text-xs leading-snug ${theme.caption}`}
                        >
                            {caption}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Endless side-scrolling strip of feature cards. The list is rendered twice so the
 * loop is seamless; hovering pauses it. With reduced motion it becomes a plain
 * horizontally scrollable row.
 */
export default function FeatureMarquee({
    variant = 'dark',
    className = '',
}: {
    variant?: keyof typeof themes;
    className?: string;
}) {
    return (
        <div
            role="region"
            aria-label="Platform highlights"
            className={`group/marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none] ${className}`}
        >
            <div className="flex w-max motion-safe:animate-marquee motion-safe:group-hover/marquee:[animation-play-state:paused]">
                <Cards variant={variant} />
                <Cards variant={variant} hidden />
            </div>
        </div>
    );
}
