<?php
// POST /api/manager_login.php   body: email, password   (managers)
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$body = read_json_body();
$email = strtolower(str_field($body, 'email', 150));
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

if ($email === '' || $password === '') {
    throw new HttpError('Enter your email and password.', 422);
}

$stmt = db()->prepare("SELECT manager_id, full_name, email, password_hash FROM manager WHERE email = ?");
$stmt->execute([$email]);
$manager = $stmt->fetch();

if (!$manager || !password_verify($password, $manager['password_hash'])) {
    throw new HttpError('Invalid email or password.', 401);
}

start_login_session((int) $manager['manager_id'], 'manager');

json_ok('Login successful.', [
    'role' => 'manager',
    'user' => [
        'id' => (int) $manager['manager_id'],
        'full_name' => $manager['full_name'],
        'email' => $manager['email'],
    ],
]);
