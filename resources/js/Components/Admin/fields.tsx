import { PropsWithChildren } from 'react';

export const inputClass =
    'block w-full rounded-xl border border-[#cfdcf0] bg-white px-4 py-3 text-base text-jubilee-ink placeholder:text-jubilee-hint transition focus:border-jubilee-blue focus:ring-4 focus:ring-jubilee-blue/15 disabled:bg-slate-50';

export function Field({
    label,
    error,
    hint,
    children,
}: PropsWithChildren<{ label: string; error?: string; hint?: string }>) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-jubilee-ink">{label}</span>
            {children}
            {hint && !error && <span className="mt-1.5 block text-xs text-jubilee-muted">{hint}</span>}
            {error && (
                <span role="alert" className="mt-1.5 block text-sm text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}

export function SubmitButton({
    processing,
    children,
    className = '',
}: PropsWithChildren<{ processing: boolean; className?: string }>) {
    return (
        <button
            type="submit"
            disabled={processing}
            className={`flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(23,105,224,0.7)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/30 disabled:translate-y-0 disabled:opacity-70 ${className}`}
        >
            {processing ? 'Saving…' : children}
        </button>
    );
}
