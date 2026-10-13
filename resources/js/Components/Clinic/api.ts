import axios from 'axios';

export type ApiError = { message: string; fields: Record<string, string> };

/** Normalises a failed JSON request (Laravel validation or otherwise) for display. */
export function parseError(error: unknown): ApiError {
    const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        .response;
    const errors = response?.data?.errors ?? {};
    const fields = Object.fromEntries(Object.entries(errors).map(([key, list]) => [key, list[0]]));
    const first = Object.values(fields)[0];

    return {
        message: first ?? response?.data?.message ?? 'Something went wrong. Please try again.',
        fields,
    };
}

export const http = axios;
