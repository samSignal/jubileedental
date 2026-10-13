import PatientSearch from '@/Components/Clinic/PatientSearch';
import RegisterPatientForm from '@/Components/Clinic/RegisterPatientForm';
import SlotBooking from '@/Components/Clinic/SlotBooking';
import { Appt, DentistLite } from '@/types/clinic';
import { useState } from 'react';

/**
 * Book a visit in two moves: choose (or register) the patient, then pick a slot.
 * Pass `patient` to skip straight to the slot picker.
 */
export default function BookFlow({
    dentists,
    patient,
    defaultDate,
    defaultProcedure,
    defaultDentistId,
    onBooked,
}: {
    dentists: DentistLite[];
    patient?: { id: number; name: string };
    defaultDate?: string;
    defaultProcedure?: string;
    defaultDentistId?: number | null;
    onBooked: (appointment: Appt) => void;
}) {
    const [chosen, setChosen] = useState<{ id: number; name: string } | null>(patient ?? null);
    const [registering, setRegistering] = useState<string | null>(null);

    if (chosen) {
        return (
            <div className="space-y-4">
                <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
                    Booking for <span className="font-semibold">{chosen.name}</span>
                    {!patient && (
                        <button type="button" onClick={() => setChosen(null)} className="ml-2 font-semibold text-jubilee-blue hover:underline">
                            change
                        </button>
                    )}
                </p>
                <SlotBooking
                    dentists={dentists}
                    patientId={chosen.id}
                    defaultDate={defaultDate}
                    defaultProcedure={defaultProcedure}
                    defaultDentistId={defaultDentistId}
                    onDone={onBooked}
                />
            </div>
        );
    }

    if (registering !== null) {
        return (
            <RegisterPatientForm
                initialName={registering}
                onCancel={() => setRegistering(null)}
                onCreated={(p) => setChosen({ id: p.id, name: p.name })}
            />
        );
    }

    return (
        <PatientSearch
            autoFocus
            onSelect={(p) => setChosen({ id: p.id, name: p.name })}
            onRegister={(q) => setRegistering(q)}
        />
    );
}
