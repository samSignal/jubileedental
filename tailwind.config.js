import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            colors: {
                jubilee: {
                    blue: '#1769e0',
                    sky: '#2f9bff',
                    navy: '#0b2a6f',
                    ink: '#0c1d5a',
                    muted: '#52607f',
                    hint: '#8a97b1',
                    line: '#cfdcf0',
                },
            },
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                display: [
                    '"Plus Jakarta Sans"',
                    'Inter',
                    ...defaultTheme.fontFamily.sans,
                ],
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(14px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                heroIn: {
                    '0%': { opacity: '0', transform: 'scale(1.04)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                drift: {
                    '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
                    '33%': { transform: 'translate3d(6%,-8%,0) scale(1.12)' },
                    '66%': { transform: 'translate3d(-7%,5%,0) scale(0.94)' },
                },
                shine: {
                    '0%,55%': { backgroundPosition: '180% 0' },
                    '100%': { backgroundPosition: '-80% 0' },
                },
                twinkle: {
                    '0%,100%': { opacity: '0', transform: 'scale(0.4) rotate(0deg)' },
                    '50%': { opacity: '1', transform: 'scale(1) rotate(45deg)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-130%) skewX(-18deg)' },
                    '100%': { transform: 'translateX(330%) skewX(-18deg)' },
                },
                popIn: {
                    '0%': { opacity: '0', transform: 'translateY(-4px) scale(.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                bob: {
                    '0%,100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-3px)' },
                },
                floatDrift: {
                    '0%,100%': { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: '0.7' },
                    '50%': { transform: 'translate3d(8px,-26px,0) rotate(14deg)', opacity: '1' },
                },
                draw: {
                    '0%': { strokeDashoffset: '1' },
                    '100%': { strokeDashoffset: '0' },
                },
                wave: {
                    '0%,60%,100%': { transform: 'rotate(0deg)' },
                    '10%,30%': { transform: 'rotate(14deg)' },
                    '20%,40%': { transform: 'rotate(-8deg)' },
                    '50%': { transform: 'rotate(10deg)' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                shake: {
                    '0%,100%': { transform: 'translateX(0)' },
                    '20%': { transform: 'translateX(-6px)' },
                    '40%': { transform: 'translateX(5px)' },
                    '60%': { transform: 'translateX(-3px)' },
                    '80%': { transform: 'translateX(2px)' },
                },
            },
            animation: {
                'fade-up': 'fadeUp .7s cubic-bezier(.22,1,.36,1) both',
                'fade-in': 'fadeIn .8s ease-out both',
                'hero-in': 'heroIn 1.2s cubic-bezier(.22,1,.36,1) both',
                shake: 'shake .45s ease-in-out',
                'slide-in': 'slideIn .32s cubic-bezier(.22,1,.36,1) both',
                draw: 'draw 1.6s cubic-bezier(.22,1,.36,1) .25s both',
                wave: 'wave 2.4s ease-in-out .8s 2',
                marquee: 'marquee 38s linear infinite',
                bob: 'bob 3.4s ease-in-out infinite',
                'float-drift': 'floatDrift 12s ease-in-out infinite',
                drift: 'drift 18s ease-in-out infinite',
                'drift-slow': 'drift 26s ease-in-out infinite reverse',
                shine: 'shine 5.5s ease-in-out infinite',
                twinkle: 'twinkle 3.2s ease-in-out infinite',
                shimmer: 'shimmer .9s ease-out',
                'pop-in': 'popIn .25s ease-out both',
            },
        },
    },

    plugins: [forms],
};
