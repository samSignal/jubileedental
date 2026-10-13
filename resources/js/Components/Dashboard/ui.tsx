import { Tone } from '@/types/clinic';
import { useEffect, useRef, useState } from 'react';

export const cardClass =
    'rounded-2xl bg-white ring-1 ring-[#e6edf7] shadow-[0_1px_2px_rgba(11,42,111,0.04),0_14px_30px_-18px_rgba(11,42,111,0.18)]';

export const toneTile: Record<Tone, string> = {
    blue: 'bg-blue-50 text-jubilee-blue',
    green: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-500',
    violet: 'bg-violet-50 text-violet-600',
    teal: 'bg-cyan-50 text-cyan-600',
    slate: 'bg-slate-100 text-slate-600',
};

export const toneStroke: Record<Tone, string> = {
    blue: '#1769e0',
    green: '#059669',
    rose: '#f43f5e',
    violet: '#7c3aed',
    teal: '#0891b2',
    slate: '#475569',
};

const avatarGradients = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-violet-400 to-indigo-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-cyan-400 to-sky-600',
];

function initials(name: string): string {
    const parts = name.replace(/^Dr\.?\s+/i, '').trim().split(/\s+/);

    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

/** Initials avatar with a stable gradient derived from the name. */
export function Avatar({
    name,
    size = 40,
    className = '',
}: {
    name: string;
    size?: number;
    className?: string;
}) {
    const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const gradient = avatarGradients[hash % avatarGradients.length];

    return (
        <span
            aria-hidden="true"
            style={{ width: size, height: size, fontSize: size * 0.36 }}
            className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ${gradient} ${className}`}
        >
            {initials(name)}
        </span>
    );
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Tweens a displayed number toward `target`. The first render counts up from 0;
 * later changes (live updates) glide from the value currently on screen.
 */
export function useAnimatedValue(target: number, duration = 900): number {
    const [shown, setShown] = useState(0);
    const current = useRef(0);

    useEffect(() => {
        if (prefersReducedMotion()) {
            current.current = target;
            setShown(target);
            return;
        }

        const from = current.current;
        const start = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = from + (target - from) * eased;

            current.current = value;
            setShown(value);

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [target, duration]);

    return shown;
}

/** True for ~1.4s after `value` changes (never on first render). */
export function useChangeFlag(value: number): boolean {
    const previous = useRef<number>();
    const [flag, setFlag] = useState(false);

    useEffect(() => {
        if (previous.current !== undefined && previous.current !== value) {
            setFlag(true);
            const id = window.setTimeout(() => setFlag(false), 1400);

            return () => window.clearTimeout(id);
        }

        previous.current = value;
    }, [value]);

    useEffect(() => {
        previous.current = value;
    });

    return flag;
}

export function formatMoney(value: number, exact = false): string {
    const whole = Math.abs(value - Math.round(value)) < 0.005;

    return (
        '$' +
        value.toLocaleString('en-US', {
            minimumFractionDigits: exact || !whole ? 2 : 0,
            maximumFractionDigits: 2,
        })
    );
}

/** A number that glides to new values and briefly highlights when it changes. */
export function AnimatedNumber({
    value,
    format = 'number',
    className = '',
}: {
    value: number;
    format?: 'number' | 'money';
    className?: string;
}) {
    const shown = useAnimatedValue(value);
    const changed = useChangeFlag(value);
    const display = format === 'money' ? formatMoney(value === shown ? value : shown) : Math.round(shown).toLocaleString();

    return (
        <span
            className={`inline-block tabular-nums transition-all duration-500 ${
                changed ? 'scale-110 text-jubilee-blue' : ''
            } ${className}`}
        >
            {display}
        </span>
    );
}

export function greetingFor(date: Date): string {
    const hour = date.getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';

    return 'Good evening';
}

export function relativeTime(iso: string, now = Date.now()): string {
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.round(hours / 24);

    return `${days} day${days === 1 ? '' : 's'} ago`;
}
