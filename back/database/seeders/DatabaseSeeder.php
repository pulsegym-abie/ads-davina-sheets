<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Demo/admin login for the client mockup. Idempotent so re-seeding is safe.
        User::updateOrCreate(
            ['email' => 'admin@admin'],
            ['name' => 'Admin', 'password' => Hash::make('password')],
        );
    }
}
