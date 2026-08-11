<?php

use App\Http\Controllers\Api\AdAccountController;
use App\Http\Controllers\Api\AdsAnalyticsController;
use App\Http\Controllers\Api\AdsReportController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanySettingController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login']);
Route::get('/company-settings', [CompanySettingController::class, 'show']);

// Uploaded ad reports (file-based, no DB). TODO: wrap in Google-SSO middleware
// once the allow-list auth is in place.
Route::get('/ads/report/periods', [AdsReportController::class, 'periods']);
Route::get('/ads/report', [AdsReportController::class, 'data']);

// Google OAuth
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/client-ad-accounts', [AdAccountController::class, 'index']);
    Route::post('/client-ad-accounts', [AdAccountController::class, 'store']);
    Route::put('/client-ad-accounts/{clientAdAccount}', [AdAccountController::class, 'update']);
    Route::delete('/client-ad-accounts/{clientAdAccount}', [AdAccountController::class, 'destroy']);

    Route::get('/ads/stats', [AdsAnalyticsController::class, 'getDashboardStats']);

    Route::post('/sync/{clientAdAccount}', [SyncController::class, 'sync']);
    Route::post('/sync-all', [SyncController::class, 'syncAll']);

    Route::post('/company-settings', [CompanySettingController::class, 'update']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
});
