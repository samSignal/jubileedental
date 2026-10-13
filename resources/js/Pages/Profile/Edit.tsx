import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { ReactNode } from 'react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ auth, status }: PageProps<{ status?: string }>) {
    const mustChange = auth.user.must_change_password;

    return (
        <>
            <Head title="My profile" />

            <div className="mx-auto max-w-3xl space-y-6">
                <header>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                        My profile
                    </h1>
                    <p className="mt-1 text-jubilee-muted">
                        Keep your details up to date and your password private.
                    </p>
                </header>

                {mustChange && (
                    <div
                        role="alert"
                        className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200"
                    >
                        <p className="font-semibold">Choose your own password to continue.</p>
                        <p className="mt-1">
                            Your account was set up with a temporary password. Enter it below as
                            your current password, then pick a new one. The rest of the system
                            unlocks as soon as you do.
                        </p>
                    </div>
                )}

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e6edf7] sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={false}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e6edf7] sm:p-8">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>
            </div>
        </>
    );
}

Edit.layout = (page: ReactNode) => <DashboardLayout>{page}</DashboardLayout>;
