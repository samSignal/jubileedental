import ApplicationLogo from '@/Components/ApplicationLogo';

/** Logo, clinic name and tagline lockup used on public/auth screens. */
export default function BrandMark({
    size = 'md',
    className = '',
}: {
    size?: 'md' | 'lg';
    className?: string;
}) {
    const large = size === 'lg';

    return (
        <div
            className={`flex items-center ${
                large ? 'gap-5' : 'gap-3 sm:gap-4'
            } ${className}`}
        >
            <ApplicationLogo
                shine
                className={
                    large
                        ? 'h-[clamp(4rem,11vh,7rem)] w-[clamp(4rem,11vh,7rem)] shrink-0 drop-shadow-[0_6px_10px_rgba(23,105,224,0.25)]'
                        : 'h-12 w-12 shrink-0 drop-shadow-[0_4px_8px_rgba(23,105,224,0.25)] sm:h-16 sm:w-16 xl:h-[5.5rem] xl:w-[5.5rem]'
                }
            />
            <div>
                <p
                    className={`font-display font-extrabold leading-[1.15] tracking-tight text-jubilee-ink ${
                        large
                            ? 'text-[clamp(2rem,5.4vh,3.6rem)]'
                            : 'text-[1.55rem] sm:text-3xl xl:text-[2.95rem]'
                    }`}
                >
                    Jubilee{' '}
                    <span className="bg-gradient-to-r from-jubilee-blue to-jubilee-sky bg-clip-text text-transparent">
                        Dental
                    </span>
                </p>
                <p
                    className={`mt-1.5 font-medium leading-snug text-jubilee-muted ${
                        large
                            ? 'text-[clamp(1rem,2.6vh,1.6rem)]'
                            : 'text-[0.7rem] sm:text-sm xl:text-[1.3rem]'
                    }`}
                >
                    Healthy Smiles{' '}
                    <span aria-hidden="true" className="text-jubilee-sky">
                        •
                    </span>
                    <span className="sr-only">,</span> Brighter Lives
                </p>
            </div>
        </div>
    );
}
