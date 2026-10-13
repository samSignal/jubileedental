export type Tone = 'blue' | 'green' | 'rose' | 'violet' | 'teal' | 'slate';

export type Trend = {
    pct: number;
    direction: 'up' | 'down' | 'flat';
    label: string;
};

export type Stat = {
    key: string;
    label: string;
    value: number;
    format: 'number' | 'money';
    tone: Tone;
    icon: 'patients' | 'calendar' | 'invoice' | 'prescription';
    trend: Trend | null;
    hint: string | null;
    spark: number[] | null;
};

export type Queue = {
    waiting: number;
    in_treatment: number;
    overdue: number;
    next: { patient: string; time: string } | null;
    longest_wait: number | null;
};

export type AppointmentStatus =
    | 'scheduled'
    | 'waiting'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export type TimelineItem = {
    id: number;
    patient_id: number;
    patient: string;
    procedure: string;
    dentist: string | null;
    time: string;
    scheduled_at: string;
    duration_minutes: number;
    queue_number: number | null;
    queue_label: string | null;
    is_walk_in: boolean;
    intake_overridden: boolean;
    intake_missing: number;
    consent_pending: boolean;
    history_status: 'ok' | 'missing' | 'outdated';
    alerts: string[];
    status: AppointmentStatus;
    status_label: string;
    is_overdue: boolean;
    late_minutes: number;
    waiting_minutes: number | null;
    actions: { status: AppointmentStatus; label: string }[];
};

export type SeriesPoint = { date: string; label: string; value: number };

export type Series = {
    range: number;
    metric: 'revenue' | 'patients';
    title: string;
    points: SeriesPoint[];
    total: number;
    previous_total: number;
};

export type RecentPatient = {
    id: number;
    name: string;
    phone: string | null;
    last_visit: string | null;
    next_visit: string | null;
};

export type FollowUp = {
    id: number;
    patient: string;
    procedure: string;
    date: string;
};

export type ActivityItem = {
    key: string;
    type: 'payment' | 'appointment' | 'patient' | 'prescription';
    title: string;
    meta: string;
    tone: Tone;
    icon: string;
    at: string;
};

export type OutstandingInvoice = {
    id: number;
    number: string;
    patient: string;
    description: string;
    balance: number;
    issued: string;
};

export type Outstanding = {
    count: number;
    total: number;
    invoices: OutstandingInvoice[];
};

export type Options = {
    patients: { id: number; name: string; phone: string | null }[];
    dentists: { id: number; name: string }[];
};

export type Permissions = {
    createPatient: boolean;
    bookAppointment: boolean;
    addInvoice: boolean;
    recordPayment: boolean;
    prescribe: boolean;
    seesRevenue: boolean;
    manageUsers: boolean;
};

export type PanelKey =
    | 'patient'
    | 'appointment'
    | 'invoice'
    | 'payment'
    | 'prescription';

/* ------------------------------------------------------------ Phase 2: patients and flow */

export type IntakeItem = {
    key: string;
    label: string;
    section: 'details' | 'medical' | 'consent';
};

export type Appt = {
    id: number;
    patient_id: number;
    patient: string;
    dentist_id: number | null;
    dentist: string | null;
    procedure: string;
    scheduled_at: string;
    time: string;
    ends: string;
    duration_minutes: number;
    status: AppointmentStatus;
    status_label: string;
    queue_number: number | null;
    queue_label: string | null;
    is_walk_in: boolean;
    intake_overridden: boolean;
    checked_in_at: string | null;
    checked_in_time: string | null;
    waiting_minutes: number | null;
    alerts?: string[];
    intake_missing?: IntakeItem[];
    consent_pending?: boolean;
    history_status?: 'ok' | 'missing' | 'outdated';
    billing?: { lines: { service_id: number | null; description: string; quantity: number; unit_price: number; total?: number }[]; total: number; paid: number; balance: number; invoice_number: string | null; settled: boolean };
    date?: string;
    clock?: string;
};

export type PatientDetails = {
    phone: string | null;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    national_id: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    medical_aid_provider: string | null;
    medical_aid_number: string | null;
};

export type HistoryDetails = {
    allergies: string | null;
    conditions: string[];
    other_conditions: string | null;
    medications: string | null;
    is_pregnant: boolean | null;
    is_smoker: boolean | null;
    last_dental_visit: string | null;
    notes: string | null;
};

export type ConsentStatus = {
    type: string;
    label: string;
    description: string;
    required: boolean;
    valid: boolean;
    signed_by_name: string | null;
    on: string | null;
};

export type PatientSummary = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    age: number | null;
    is_minor: boolean;
    gender: string | null;
    intake: { complete: boolean; missing: IntakeItem[] };
    alerts?: string[];
    consent_pending?: boolean;
    history_status?: 'ok' | 'missing' | 'outdated';
    today: Appt[];
    details?: PatientDetails;
    history?: HistoryDetails | null;
    history_recorded?: boolean;
    history_updated?: string | null;
    consents?: ConsentStatus[];
};

export type DentistLite = { id: number; name: string };

/* ------------------------------------------------------------ simplified reception + billing */

export type BillingLine = {
    service_id: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    total?: number;
};

export type Billing = {
    lines: BillingLine[];
    total: number;
    paid: number;
    balance: number;
    invoice_number: string | null;
    settled: boolean;
};

export type ServiceItem = { id: number; name: string; price: number };

export type HistoryStatus = 'ok' | 'missing' | 'outdated';
