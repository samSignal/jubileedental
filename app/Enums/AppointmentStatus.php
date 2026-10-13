<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Scheduled = 'scheduled';
    case Waiting = 'waiting';
    case InProgress = 'in_progress';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Waiting => 'Waiting',
            self::InProgress => 'In Progress',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
            self::NoShow => 'No-show',
        };
    }

    /**
     * Statuses this one may move to.
     *
     * @return array<int, self>
     */
    public function nextStatuses(): array
    {
        return match ($this) {
            self::Scheduled => [self::Waiting, self::Cancelled, self::NoShow],
            self::Waiting => [self::InProgress, self::Cancelled],
            self::InProgress => [self::Completed],
            default => [],
        };
    }

    public function canMoveTo(self $to): bool
    {
        return in_array($to, $this->nextStatuses(), true);
    }
}
