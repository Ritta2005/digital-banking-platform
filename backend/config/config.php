<?php
// backend/config/config.php
// Database + CORS settings. The defaults match a fresh XAMPP MySQL
// (user "root", EMPTY password). To use your own values WITHOUT editing
// this file, copy config.example.php to config.local.php and change it.
// config.local.php is ignored by Git, so real passwords never reach GitHub.

$config = [
    'db_host' => '127.0.0.1',
    'db_port' => '3306',
    'db_name' => 'digital_banking_final',
    'db_user' => 'root',
    'db_pass' => 'ritta123',

    // Websites allowed to call this API (the React dev server).
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    // Logged-in session is dropped after this many idle seconds.
    'session_idle_seconds' => 1800,
];

$localFile = __DIR__ . '/config.local.php';
if (file_exists($localFile)) {
    $local = require $localFile;
    $config = array_merge($config, $local);
}

return $config;
