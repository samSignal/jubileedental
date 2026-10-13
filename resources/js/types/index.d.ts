export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    username?: string | null;
    role: string | null;
    role_label: string | null;
    permissions: string[];
    must_change_password: boolean;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
