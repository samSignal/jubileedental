<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_registration_is_not_publicly_available(): void
    {
        $this->get('/register')->assertNotFound();
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function builtInRoles(): array
    {
        return [
            'admin' => ['admin'],
            'receptionist' => ['receptionist'],
            'dentist' => ['dentist'],
        ];
    }

    #[DataProvider('builtInRoles')]
    public function test_every_role_signs_in_to_the_dashboard(string $role): void
    {
        $user = User::factory()->role($role)->create();

        $this->post('/login', ['login' => $user->email, 'password' => 'password'])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_users_can_authenticate_with_their_username(): void
    {
        $user = User::factory()->role('dentist')->create(['username' => 'dr.moyo']);

        $this->post('/login', ['login' => 'dr.moyo', 'password' => 'password'])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_users_can_not_authenticate_with_an_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', ['login' => $user->email, 'password' => 'wrong-password'])
            ->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_deactivated_users_can_not_authenticate(): void
    {
        $user = User::factory()->inactive()->create();

        $this->post('/login', ['login' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 5) as $attempt) {
            $this->post('/login', ['login' => $user->email, 'password' => 'wrong']);
        }

        $this->post('/login', ['login' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('login');

        $this->assertGuest();
    }

    public function test_the_dashboard_requires_a_signed_in_user(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_the_root_sends_people_to_their_dashboard(): void
    {
        $this->actingAs(User::factory()->role('dentist')->create())
            ->get('/')
            ->assertRedirect('/dashboard');
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/logout')->assertRedirect('/');

        $this->assertGuest();
    }
}
