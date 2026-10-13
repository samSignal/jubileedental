import { CloseIcon } from '@/Components/Dashboard/DashboardIcons';
import { PropsWithChildren, useEffect, useRef } from 'react';

/** Right-hand panel that keeps staff on the dashboard while they fill in a form. */
export default function SlideOver({
    open,
    title,
    subtitle,
    onClose,
    children,
}: PropsWithChildren<{
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
}>) {
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const previous = document.activeElement as HTMLElement | null;
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        // Move focus into the panel's first field.
        const id = window.setTimeout(() => {
            panel.current
                ?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]')
                ?.focus();
        }, 60);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            window.clearTimeout(id);
            previous?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70]">
            <button
                type="button"
                aria-label="Close panel"
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] motion-safe:animate-fade-in"
            />
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-[-24px_0_60px_-20px_rgba(11,42,111,0.35)] motion-safe:animate-slide-in"
            >
                <header className="flex items-start justify-between gap-4 border-b border-[#e6edf7] px-6 py-5">
                    <div>
                        <h2 className="font-display text-xl font-extrabold tracking-tight text-jubilee-ink">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-1 text-sm text-jubilee-muted">{subtitle}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-jubilee-muted transition hover:bg-blue-50 hover:text-jubilee-ink"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </header>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    );
}
