<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'weekday', 'start_time', 'end_time'])]
class DentistSchedule extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
