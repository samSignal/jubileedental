import BrandMark from '@/Components/BrandMark';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-[radial-gradient(60%_45%_at_80%_0%,#e6f1ff,transparent),radial-gradient(50%_40%_at_0%_100%,#eef5ff,transparent)] bg-white px-4 py-10 font-sans sm:justify-center">
            <Link
                href="/"
                aria-label="Jubilee Dental home"
                className="motion-safe:animate-fade-up"
            >
                <BrandMark />
            </Link>

            <div
                className="mt-8 w-full overflow-hidden rounded-2xl bg-white px-6 py-7 shadow-[0_20px_50px_-20px_rgba(11,42,111,0.35)] ring-1 ring-jubilee-line/60 motion-safe:animate-fade-up sm:max-w-md sm:px-8"
                style={{ animationDelay: '120ms' }}
            >
                {children}
            </div>
        </div>
    );
}
