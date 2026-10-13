<?php

namespace App\Enums;

/**
 * The catalogue of protected capabilities. Each one is something the application
 * actually enforces, so the list lives in code. Which permissions a role holds is
 * data (roles.permissions) that administrators edit in the UI.
 * Every case is registered as a Gate ability of the same name (AppServiceProvider).
 */
enum Permission: string
{
    case PatientsView = 'patients.view';
    case PatientsCreate = 'patients.create';
    case PatientsUpdate = 'patients.update';

    case AppointmentsView = 'appointments.view';
    case AppointmentsBook = 'appointments.book';
    case AppointmentsQueue = 'appointments.queue';
    case AppointmentsTreat = 'appointments.treat';
    case SchedulesManage = 'schedules.manage';

    case InvoicesCreate = 'invoices.create';
    case PaymentsRecord = 'payments.record';
    case FinanceView = 'finance.view';

    case PrescriptionsCreate = 'prescriptions.create';
    case ClinicalView = 'clinical.view';

    case ReportsView = 'reports.view';

    case UsersManage = 'users.manage';
    case RolesManage = 'roles.manage';
    case SettingsManage = 'settings.manage';

    public function label(): string
    {
        return match ($this) {
            self::PatientsView => 'View patient records',
            self::PatientsCreate => 'Register new patients',
            self::PatientsUpdate => 'Edit patient details, intake and consent',
            self::AppointmentsView => 'View the appointment schedule',
            self::AppointmentsBook => 'Book appointments',
            self::AppointmentsQueue => 'Check patients in, cancel and mark no-shows',
            self::AppointmentsTreat => 'Start and complete treatment',
            self::SchedulesManage => 'Set dentist working hours',
            self::InvoicesCreate => 'Create invoices',
            self::PaymentsRecord => 'Record payments',
            self::FinanceView => 'See revenue and outstanding balances',
            self::PrescriptionsCreate => 'Write prescriptions',
            self::ClinicalView => 'View clinical notes and history',
            self::ReportsView => 'View reports',
            self::UsersManage => 'Manage staff accounts',
            self::RolesManage => 'Create roles and edit their permissions',
            self::SettingsManage => 'Change system settings',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::PatientsView, self::PatientsCreate, self::PatientsUpdate => 'Patients',
            self::AppointmentsView, self::AppointmentsBook, self::AppointmentsQueue, self::AppointmentsTreat, self::SchedulesManage => 'Appointments',
            self::InvoicesCreate, self::PaymentsRecord, self::FinanceView => 'Billing & finance',
            self::PrescriptionsCreate, self::ClinicalView => 'Clinical',
            self::ReportsView => 'Reports',
            self::UsersManage, self::RolesManage, self::SettingsManage => 'Administration',
        };
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $p) => $p->value, self::cases());
    }
}
