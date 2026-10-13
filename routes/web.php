<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\DentistScheduleController;
use App\Http\Controllers\FrontDeskController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PatientIntakeController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\RoleDashboardController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\VisitBillingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('dashboard'));

Route::middleware('auth')->group(function () {
    // One dashboard for everyone: its content is built from the user's permissions.
    Route::get('/dashboard', RoleDashboardController::class)->name('dashboard');

    // Everything below is authorised by permission (see App\Enums\Permission).

    // Patients: search, profiles, intake and consent.
    Route::get('/patients', [PatientController::class, 'index'])
        ->middleware('can:patients.view')->name('patients.index');
    Route::get('/patients/search', [PatientController::class, 'search'])
        ->middleware('can:patients.view')->name('patients.search');
    Route::post('/patients', [PatientController::class, 'store'])
        ->middleware('can:patients.create')->name('patients.store');
    Route::get('/patients/{patient}', [PatientController::class, 'show'])
        ->middleware('can:patients.view')->name('patients.show');
    Route::get('/patients/{patient}/summary', [PatientController::class, 'summary'])
        ->middleware('can:patients.view')->name('patients.summary');
    Route::patch('/patients/{patient}', [PatientController::class, 'update'])
        ->middleware('can:patients.update')->name('patients.update');
    Route::put('/patients/{patient}/intake', [PatientIntakeController::class, 'store'])
        ->middleware('can:patients.update')->name('patients.intake');
    Route::patch('/consents/{consent}/revoke', [PatientIntakeController::class, 'revokeConsent'])
        ->middleware('can:patients.update')->name('consents.revoke');

    // Appointments, walk-ins, the queue and its notifications.
    Route::get('/appointments', [AppointmentController::class, 'index'])
        ->middleware('can:appointments.view')->name('appointments.index');
    Route::get('/appointments/availability', [AppointmentController::class, 'availability'])
        ->middleware('can:appointments.view')->name('appointments.availability');
    Route::post('/appointments', [AppointmentController::class, 'store'])
        ->middleware('can:appointments.book')->name('appointments.store');
    Route::post('/appointments/walk-in', [AppointmentController::class, 'walkIn'])
        ->middleware('can:appointments.book')->name('appointments.walk-in');
    Route::patch('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule'])
        ->middleware('can:appointments.book')->name('appointments.reschedule');
    Route::patch('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus'])
        ->middleware('can:appointments.view')->name('appointments.status');
    Route::post('/appointments/{appointment}/check-in', [AppointmentController::class, 'checkIn'])
        ->middleware('can:appointments.queue')->name('appointments.check-in');
    Route::post('/appointments/{appointment}/notify', [AppointmentController::class, 'notify'])
        ->middleware(['can:appointments.queue', 'throttle:30,1'])->name('appointments.notify');

    Route::post('/appointments/{appointment}/complete', [VisitBillingController::class, 'complete'])
        ->middleware('can:appointments.treat')->name('appointments.complete');
    Route::post('/appointments/{appointment}/payment', [VisitBillingController::class, 'pay'])
        ->middleware('can:payments.record')->name('appointments.pay');
    Route::get('/services', [ServiceController::class, 'list'])
        ->middleware('can:appointments.view')->name('services.list');

    Route::get('/front-desk', [FrontDeskController::class, 'index'])
        ->middleware('can:appointments.queue')->name('frontdesk.index');

    Route::post('/notifications/read', [NotificationController::class, 'read'])->name('notifications.read');

    Route::post('/invoices', [InvoiceController::class, 'store'])
        ->middleware('can:invoices.create')->name('invoices.store');
    Route::post('/payments', [PaymentController::class, 'store'])
        ->middleware('can:payments.record')->name('payments.store');

    Route::post('/prescriptions', [PrescriptionController::class, 'store'])
        ->middleware('can:prescriptions.create')->name('prescriptions.store');

    Route::middleware('can:schedules.manage')->prefix('admin/schedules')->name('schedules.')->group(function () {
        Route::get('/', [DentistScheduleController::class, 'index'])->name('index');
        Route::put('/{user}', [DentistScheduleController::class, 'update'])->name('update');
    });

    Route::middleware('can:settings.manage')->prefix('admin/services')->name('services.')->group(function () {
        Route::get('/', [ServiceController::class, 'index'])->name('index');
        Route::post('/', [ServiceController::class, 'store'])->name('store');
        Route::patch('/{service}', [ServiceController::class, 'update'])->name('update');
    });

    Route::middleware('can:users.manage')->prefix('admin/users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::post('/', [UserController::class, 'store'])->name('store');
        Route::patch('/{user}', [UserController::class, 'update'])->name('update');
        Route::put('/{user}/password', [UserController::class, 'resetPassword'])->name('password');
    });

    Route::middleware('can:roles.manage')->prefix('admin/roles')->name('roles.')->group(function () {
        Route::get('/', [RoleController::class, 'index'])->name('index');
        Route::post('/', [RoleController::class, 'store'])->name('store');
        Route::patch('/{role}', [RoleController::class, 'update'])->name('update');
        Route::delete('/{role}', [RoleController::class, 'destroy'])->name('destroy');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
});

require __DIR__.'/auth.php';
