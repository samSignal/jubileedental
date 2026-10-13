<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Mark one notification (or all of the user's) as read.
     */
    public function read(Request $request): RedirectResponse
    {
        $query = $request->user()->unreadNotifications();

        if ($request->filled('id')) {
            $query->where('id', $request->string('id')->toString());
        }

        $query->update(['read_at' => now()]);

        return back();
    }
}
