import ApplicationLogo from '@/Components/ApplicationLogo';
import BrandMark from '@/Components/BrandMark';
import FeatureMarquee from '@/Components/FeatureMarquee';
import FloatingShapes from '@/Components/FloatingShapes';
import {
    AlertIcon,
    ChartIcon,
    EyeIcon,
    EyeOffIcon,
    LockIcon,
    LoginIcon,
    MoonIcon,
    ShieldCheckIcon,
    ShieldIcon,
    SparkleIcon,
    SunIcon,
    ToothIcon,
    UserIcon,
    UsersIcon,
} from '@/Components/Icons';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    CSSProperties,
    FormEventHandler,
    KeyboardEvent,
    PointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';


/** Twinkles placed over the clinic photo (percent of the image box). */
const sparkles = [
    { x: 68, y: 30, size: 22, delay: 0 },
    { x: 58, y: 53, size: 16, delay: 1.1 },
    { x: 21, y: 57, size: 18, delay: 2.0 },
    { x: 89, y: 24, size: 14, delay: 0.6 },
    { x: 84, y: 80, size: 16, delay: 1.7 },
];

const fieldBase =
    'peer block h-14 w-full rounded-xl border bg-white/90 pl-14 pt-4 text-base text-jubilee-ink shadow-sm outline-none backdrop-blur transition-all duration-200 placeholder:text-transparent focus:ring-4 sm:h-16 sm:text-lg';
const fieldOk =
    'border-jubilee-line hover:border-jubilee-sky/60 focus:border-jubilee-blue focus:ring-jubilee-blue/15';
const fieldBad = 'border-red-400 focus:border-red-500 focus:ring-red-500/15';
const iconBase =
    'pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-jubilee-hint transition-colors duration-200 peer-focus:text-jubilee-blue';
const floatingLabel =
    'pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 text-base text-jubilee-hint transition-all duration-200 sm:text-lg ' +
    'peer-focus:top-3.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-jubilee-blue ' +
    'peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-semibold';

/** Staggered entrance; skipped automatically when the user prefers reduced motion. */
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const rise = 'motion-safe:animate-fade-up';

function greeting(): { text: string; night: boolean } {
    const hour = new Date().getHours();

    if (hour < 5) return { text: 'Working late', night: true };
    if (hour < 12) return { text: 'Good morning', night: false };
    if (hour < 17) return { text: 'Good afternoon', night: false };
    if (hour < 21) return { text: 'Good evening', night: false };

    return { text: 'Good evening', night: true };
}

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: true as boolean,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const hello = useMemo(greeting, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // Return focus to the password field after a failed attempt.
    useEffect(() => {
        if (errors.login) {
            passwordRef.current?.focus();
        }
    }, [errors.login]);

    // Cursor-driven parallax + spotlight, written straight to CSS variables.
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return;

        const el = rootRef.current;
        if (!el) return;

        el.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
        el.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
        el.style.setProperty('--mx', `${e.clientX}px`);
        el.style.setProperty('--my', `${e.clientY}px`);
    };

    const resetPointer = () => {
        const el = rootRef.current;
        if (!el) return;

        el.style.setProperty('--px', '0');
        el.style.setProperty('--py', '0');
    };

    const trackCaps = (e: KeyboardEvent<HTMLInputElement>) =>
        setCapsLock(e.getModifierState('CapsLock'));

    const formError = errors.login;

    return (
        <>
            <Head title="Sign In" />

            <div
                ref={rootRef}
                onPointerMove={onPointerMove}
                onPointerLeave={resetPointer}
                style={{ '--mx': '-999px', '--my': '-999px' } as CSSProperties}
                className="flex min-h-screen flex-col bg-white font-sans lg:grid lg:grid-cols-2"
            >
                {/* Photo header: phones and tablets */}
                <header className="relative overflow-hidden bg-gradient-to-br from-white via-[#f1f7fe] to-[#dfeaf8] lg:hidden">
                    <div className="relative z-10 px-6 pt-7 sm:px-12 sm:pt-10">
                        <BrandMark className={rise} />
                    </div>
                    <div className="relative mt-2">
                        <img
                            src="/images/login-hero.webp"
                            alt=""
                            className="h-48 w-full select-none object-cover object-[60%_100%] motion-safe:animate-hero-in sm:h-64 md:h-72"
                            style={{
                                maskImage:
                                    'linear-gradient(to bottom, transparent 0%, #000 38%)',
                                WebkitMaskImage:
                                    'linear-gradient(to bottom, transparent 0%, #000 38%)',
                            }}
                            draggable={false}
                        />
                        <SparkleIcon
                            style={delay(600)}
                            className="absolute right-[18%] top-[42%] h-4 w-4 text-white drop-shadow motion-safe:animate-twinkle"
                        />
                        <SparkleIcon
                            style={delay(1700)}
                            className="absolute left-[24%] top-[60%] h-3 w-3 text-white drop-shadow motion-safe:animate-twinkle"
                        />
                    </div>
                </header>

                {/* Brand / hero panel: desktop */}
                <aside className="relative hidden h-screen overflow-hidden bg-gradient-to-br from-white via-[#f3f8fd] to-[#e3edf8] lg:block">
                    <FloatingShapes />
                    {/* slow drifting light */}
                    <div className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-jubilee-sky/20 blur-3xl motion-safe:animate-drift" />
                    <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl motion-safe:animate-drift-slow" />

                    <div className="relative z-10 pl-[11.5%] pr-8 pt-[5.5vh]">
                        <div className={rise}>
                            <BrandMark size="lg" />
                        </div>

                        <span
                            style={delay(120)}
                            className={`${rise} mt-[3.5vh] hidden items-center gap-2 [@media(min-height:820px)]:inline-flex rounded-full border border-white/70 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-jubilee-blue shadow-sm backdrop-blur`}
                        >
                            {hello.night ? (
                                <MoonIcon className="h-4 w-4" />
                            ) : (
                                <SunIcon className="h-4 w-4" />
                            )}
                            {hello.text}
                        </span>

                        <h2
                            style={delay(180)}
                            className={`${rise} mt-[1.2vh] font-display text-[clamp(1.75rem,4.4vh,2.75rem)] font-extrabold tracking-tight text-jubilee-ink`}
                        >
                            Welcome Back!
                        </h2>
                        <p
                            style={delay(260)}
                            className={`${rise} mt-[1.5vh] max-w-[min(23rem,26vw)] text-[clamp(0.9rem,2vh,1.25rem)] leading-relaxed text-jubilee-muted`}
                        >
                            Access your clinic system to manage patients,
                            appointments, treatments and more.
                        </p>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-0">
                        {/* Depth layers: photo and sparkles follow the cursor in every direction at different speeds.
                            Transforms live on wrappers so the entrance animation on <img> can't clash. */}
                        <div className="relative overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_16%)]">
                            <div className="relative transition-transform duration-500 ease-out will-change-transform [transform:perspective(1100px)_translate3d(calc(-18px+var(--px,0)*-34px),calc(var(--py,0)*-28px),0)_rotateX(calc(var(--py,0)*-4deg))_rotateY(calc(var(--px,0)*5deg))_scale(1.1)] motion-reduce:[transform:none]">
                                <img
                                    src="/images/login-hero.webp"
                                    alt=""
                                    className="block w-full select-none motion-safe:animate-hero-in"
                                    draggable={false}
                                />
                            </div>
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 transition-transform duration-300 ease-out [transform:translate3d(calc(var(--px,0)*-70px),calc(var(--py,0)*-46px),0)] motion-reduce:[transform:none]"
                            >
                                {sparkles.map((s) => (
                                    <SparkleIcon
                                        key={`${s.x}-${s.y}`}
                                        style={{
                                            left: `${s.x}%`,
                                            top: `${s.y}%`,
                                            width: s.size,
                                            height: s.size,
                                            animationDelay: `${s.delay}s`,
                                        }}
                                        className="absolute -translate-x-1/2 -translate-y-1/2 text-white opacity-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] motion-safe:animate-twinkle"
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="bg-[linear-gradient(90deg,#0d3978,#0e3a7b_50%,#124284)] pb-[3.5vh] pt-[1.5vh]">
                            <FeatureMarquee variant="dark" />
                        </div>
                    </div>
                </aside>

                {/* Sign-in panel */}
                <main className="relative z-10 -mt-8 flex flex-1 items-start justify-center overflow-hidden rounded-t-[2rem] bg-white px-6 pb-10 pt-9 shadow-[0_-14px_30px_-18px_rgba(11,42,111,0.35)] sm:px-12 sm:pt-12 lg:mt-0 lg:min-h-screen lg:items-center lg:rounded-none lg:py-10 lg:shadow-none">
                    {/* aurora + cursor spotlight */}
                    <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl lg:h-96 lg:w-96 lg:bg-sky-200/45 motion-safe:animate-drift" />
                    <div className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full bg-blue-200/25 blur-3xl lg:h-96 lg:w-96 lg:bg-blue-200/40 motion-safe:animate-drift-slow" />
                    <div className="pointer-events-none absolute inset-0 hidden bg-fixed [background-image:radial-gradient(380px_circle_at_var(--mx)_var(--my),rgba(47,155,255,0.12),transparent_70%)] lg:block" />

                    <div className="relative w-full max-w-[460px]">
                        {/* Desktop only: the wordmark already lives on the hero, so this side gets a portal emblem instead. */}
                        <div
                            style={delay(100)}
                            className={`${rise} hidden items-center gap-4 lg:flex`}
                        >
                            <div className="relative h-16 w-16 shrink-0">
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 rounded-2xl bg-jubilee-sky/30 motion-safe:animate-ping [animation-duration:3.2s]"
                                />
                                <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-white to-[#e8f2ff] shadow-[0_12px_24px_-10px_rgba(23,105,224,0.55)] ring-1 ring-jubilee-line">
                                    <ApplicationLogo shine className="h-9 w-9" />
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-jubilee-blue">
                                    Staff Portal
                                </p>
                                <p className="mt-1 text-sm text-jubilee-muted">
                                    Dentists · Reception · Cashiers
                                </p>
                            </div>
                        </div>

                        <h1
                            style={delay(180)}
                            className={`${rise} font-display text-[1.9rem] font-extrabold tracking-tight text-jubilee-ink sm:text-4xl lg:mt-10`}
                        >
                            Sign In
                        </h1>
                        <p
                            style={delay(240)}
                            className={`${rise} mt-2 text-base text-jubilee-muted sm:mt-3 sm:text-xl`}
                        >
                            Enter your credentials to continue
                        </p>

                        {status && (
                            <div
                                role="status"
                                className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
                            >
                                {status}
                            </div>
                        )}

                        {formError && (
                            <div
                                role="alert"
                                className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 motion-safe:animate-shake"
                            >
                                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form
                            onSubmit={submit}
                            className="mt-8 space-y-5 sm:mt-9 sm:space-y-6"
                            noValidate
                        >
                            <div style={delay(300)} className={`${rise} relative`}>
                                <input
                                    id="login"
                                    name="login"
                                    type="text"
                                    value={data.login}
                                    onChange={(e) =>
                                        setData('login', e.target.value)
                                    }
                                    placeholder=" "
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    autoFocus
                                    required
                                    aria-invalid={!!formError}
                                    className={`${fieldBase} pr-5 ${
                                        formError ? fieldBad : fieldOk
                                    }`}
                                />
                                <UserIcon className={iconBase} />
                                <label htmlFor="login" className={floatingLabel}>
                                    Username or Email
                                </label>
                            </div>

                            <div style={delay(360)} className={rise}>
                                <div className="relative">
                                    <input
                                        id="password"
                                        ref={passwordRef}
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        onKeyDown={trackCaps}
                                        onKeyUp={trackCaps}
                                        onBlur={() => setCapsLock(false)}
                                        placeholder=" "
                                        autoComplete="current-password"
                                        required
                                        aria-invalid={!!errors.password}
                                        className={`${fieldBase} pr-14 ${
                                            errors.password ? fieldBad : fieldOk
                                        }`}
                                    />
                                    <LockIcon className={iconBase} />
                                    <label
                                        htmlFor="password"
                                        className={floatingLabel}
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((visible) => !visible)
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        aria-pressed={showPassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-jubilee-hint transition-colors hover:bg-jubilee-blue/5 hover:text-jubilee-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-jubilee-blue"
                                    >
                                        {showPassword ? (
                                            <EyeIcon className="h-6 w-6" />
                                        ) : (
                                            <EyeOffIcon className="h-6 w-6" />
                                        )}
                                    </button>
                                </div>

                                {capsLock && (
                                    <p
                                        role="status"
                                        className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-600 motion-safe:animate-pop-in"
                                    >
                                        <AlertIcon className="h-4 w-4" />
                                        Caps Lock is on
                                    </p>
                                )}
                                {errors.password && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <div
                                style={delay(420)}
                                className={`${rise} flex flex-wrap items-center justify-between gap-x-4 gap-y-3`}
                            >
                                <label className="flex cursor-pointer select-none items-center gap-3 text-base text-jubilee-ink">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) =>
                                            setData('remember', e.target.checked)
                                        }
                                        className="h-6 w-6 cursor-pointer rounded-md border-jubilee-line text-jubilee-blue transition-transform duration-150 focus:ring-jubilee-blue/30 active:scale-90"
                                    />
                                    Remember me
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="group relative rounded text-base font-medium text-jubilee-blue transition-colors hover:text-jubilee-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-jubilee-blue"
                                    >
                                        Forgot password?
                                        <span className="absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 rounded bg-jubilee-sky transition-transform duration-300 group-hover:scale-x-100" />
                                    </Link>
                                )}
                            </div>

                            <div style={delay(480)} className={rise}>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    aria-busy={processing}
                                    className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-jubilee-blue to-[#2b86f5] text-lg font-semibold text-white shadow-[0_10px_22px_-8px_rgba(23,105,224,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-8px_rgba(23,105,224,0.7)] focus:outline-none focus-visible:ring-4 focus-visible:ring-jubilee-blue/30 active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-80 sm:h-16 sm:text-xl"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -translate-x-[130%] bg-white/30 blur-sm group-hover:motion-safe:animate-shimmer"
                                    />
                                    {processing ? (
                                        <>
                                            <ToothIcon className="h-6 w-6 motion-safe:animate-pulse" />
                                            Signing in…
                                        </>
                                    ) : (
                                        <>
                                            <LoginIcon className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-0.5" />
                                            Sign In
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div
                            style={delay(540)}
                            className={`${rise} mt-8 flex items-center gap-4 text-base text-jubilee-hint`}
                            aria-hidden="true"
                        >
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-jubilee-line" />
                            or
                            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-jubilee-line" />
                        </div>

                        <p
                            style={delay(600)}
                            className={`${rise} mt-8 flex items-center justify-center gap-2.5 text-sm text-jubilee-muted sm:text-base`}
                        >
                            <ShieldIcon className="h-5 w-5 text-jubilee-sky sm:h-6 sm:w-6" />
                            Secure · Private · Trusted
                        </p>
                    </div>
                </main>

                <section
                    aria-label="Highlights"
                    className="relative bg-gradient-to-b from-white to-[#eaf3fe] pb-10 pt-2 lg:hidden"
                >
                    <FeatureMarquee variant="light" />
                </section>
            </div>
        </>
    );
}
