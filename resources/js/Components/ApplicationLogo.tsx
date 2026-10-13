import { ImgHTMLAttributes } from 'react';

/**
 * The Jubilee Dental tooth mark (extracted from the approved design).
 * With `shine`, a soft light sweep periodically glides across the mark.
 */
export default function ApplicationLogo({
    className = '',
    shine = false,
    ...props
}: ImgHTMLAttributes<HTMLImageElement> & { shine?: boolean }) {
    const image = (
        <img
            src="/images/logo.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`object-contain ${shine ? 'h-full w-full' : className}`}
            {...props}
        />
    );

    if (!shine) {
        return image;
    }

    const mask = {
        WebkitMaskImage: 'url(/images/logo.png)',
        maskImage: 'url(/images/logo.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
    } as const;

    return (
        <span className={`relative inline-block ${className}`}>
            {image}
            <span
                aria-hidden="true"
                style={mask}
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.95)_50%,transparent_65%)] bg-[length:250%_100%] bg-no-repeat motion-safe:animate-shine motion-reduce:hidden"
            />
        </span>
    );
}
