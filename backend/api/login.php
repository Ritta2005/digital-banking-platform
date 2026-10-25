<?php
// POST /api/login.php   body: email, password   (customers)
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$body = read_json_body();
$email = strtolower(str_field($body, 'email', 150));
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

if ($email === '' || $password === '') {
    throw new HttpError('Enter your email and password.', 422);
}

$stmt = db()->prepare("SELECT customer_id, full_name, email, password_hash FROM customer WHERE email = ?");
$stmt->execute([$email]);
$customer = $stmt->fetch();

// Same message for "no such user" and "wrong password" (do not reveal which).
if (!$customer || !password_verify($password, $customer['password_hash'])) {
    throw new HttpError('Invalid email or password.', 401);
}

start_login_session((int) $customer['customer_id'], 'customer');

json_ok('Login successful.', [
    'role' => 'customer',
    'user' => [
        'id' => (int) $customer['customer_id'],
        'full_name' => $customer['full_name'],
        'email' => $customer['email'],
    ],
]);
