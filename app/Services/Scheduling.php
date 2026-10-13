<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\DentistSchedule;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Working hours, double-booking and free-slot logic for dentists.
 *
 * A dentist with no hours configured is treated as "unrestricted" so a clinic can
 * adopt schedules gradually; as soon as hours exist they are enforced.
 */
class Scheduling
{
    public const DEFAULT_START = '08:00';

    public const DEFAULT_END = '17:00';

    public function hasSchedule(User $dentist): bool
    {
        return DentistSchedule::where('user_id', $dentist->id)->exists();
    }

    /**
     * Working blocks for the given day (empty on days off).
     *
     * @return Collection<int, array{start: Carbon, end: Carbon}>
     */
    public function blocksFor(User $dentist, Carbon $day): Collection
    {
        return DentistSchedule::query()
            ->where('user_id', $dentist->id)
            ->where('weekday', $day->dayOfWeek)
            ->orderBy('start_time')
            ->get()
            ->map(fn (DentistSchedule $s) => [
                'start' => $day->copy()->setTimeFromTimeString($s->start_time),
                'end' => $day->copy()->setTimeFromTimeString($s->end_time),
            ]);
    }

    /**
     * Blocks to offer for suggestions: configured hours, or the default clinic day.
     *
     * @return Collection<int, array{start: Carbon, end: Carbon}>
     */
    public function suggestionBlocks(User $dentist, Carbon $day): Collection
    {
        if ($this->hasSchedule($dentist)) {
            return $this->blocksFor($dentist, $day);
        }

        if ($day->isSunday()) {
            return collect();
        }

        return collect([[
            'start' => $day->copy()->setTimeFromTimeString(self::DEFAULT_START),
            'end' => $day->copy()->setTimeFromTimeString(self::DEFAULT_END),
        ]]);
    }

    public function withinWorkingHours(User $dentist, Carbon $start, Carbon $end): bool
    {
        if (! $this->hasSchedule($dentist)) {
            return true;
        }

        return $this->blocksFor($dentist, $start->copy()->startOfDay())
            ->contains(fn (array $b) => $start->gte($b['start']) && $end->lte($b['end']));
    }

    public function conflicts(User $dentist, Carbon $start, Carbon $end, ?int $ignoreAppointmentId = null): bool
    {
        return Appointment::query()
            ->where('dentist_id', $dentist->id)
            ->whereIn('status', [
                AppointmentStatus::Scheduled->value,
                AppointmentStatus::Waiting->value,
                AppointmentStatus::InProgress->value,
            ])
            ->whereBetween('scheduled_at', [$start->copy()->startOfDay(), $start->copy()->endOfDay()])
            ->when($ignoreAppointmentId, fn ($q) => $q->where('id', '!=', $ignoreAppointmentId))
            ->get()
            ->contains(fn (Appointment $a) => $a->scheduled_at->lt($end) && $a->endsAt()->gt($start));
    }

    /**
     * Free start times for a dentist on a day.
     *
     * @return array<int, array{time: string, label: string, at: string}>
     */
    public function freeSlots(User $dentist, Carbon $day, int $duration, int $step = 15): array
    {
        $slots = [];
        $now = now();

        foreach ($this->suggestionBlocks($dentist, $day->copy()->startOfDay()) as $block) {
            for ($start = $block['start']->copy(); $start->copy()->addMinutes($duration)->lte($block['end']); $start->addMinutes($step)) {
                $end = $start->copy()->addMinutes($duration);

                if ($start->lt($now) || $this->conflicts($dentist, $start, $end)) {
                    continue;
                }

                $slots[] = [
                    'time' => $start->format('H:i'),
                    'label' => $start->format('h:i A'),
                    'at' => $start->toIso8601String(),
                ];
            }
        }

        return $slots;
    }
}
