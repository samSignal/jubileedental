<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The price list. Anyone who records or bills visits can read it; changing it is
 * an administrator task (`settings.manage`).
 */
class ServiceController extends Controller
{
    public function list(): JsonResponse
    {
        return response()->json([
            'services' => Service::active()->orderBy('name')->get(['id', 'name', 'price'])
                ->map(fn (Service $s) => ['id' => $s->id, 'name' => $s->name, 'price' => (float) $s->price])->all(),
        ]);
    }

    public function index(): Response
    {
        return Inertia::render('Services/Index', [
            'services' => Service::orderByDesc('is_active')->orderBy('name')->get()
                ->map(fn (Service $s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'price' => (float) $s->price,
                    'is_active' => $s->is_active,
                ])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('services', 'name')],
            'price' => ['required', 'numeric', 'min:0', 'max:100000'],
        ]);

        $service = Service::create([...$data, 'is_active' => true]);

        return back()->with('message', "{$service->name} was added to the price list.");
    }

    public function update(Request $request, Service $service): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('services', 'name')->ignore($service)],
            'price' => ['required', 'numeric', 'min:0', 'max:100000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $service->update($data);

        return back()->with('message', "{$service->name} was updated.");
    }
}
