<?php
// POST /api/register.php   body: full_name, email, phone, password
// Creates a customer AND one SAVINGS account (balance 0.00).
require_once __DIR__ . '/../helpers/bootstrap.php';

require_method('POST');
$body = read_json_body();

$fullName = str_field($body, 'full_name', 100);
$email    = strtolower(str_field($body, 'email', 150));
$phone    = str_field($body, 'phone', 15);
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

// ---- Server-side validation (never trust the browser) ----
$errors = [];
if (text_len($fullName) < 2) {
    $errors['full_name'] = 'Enter your full name (at least 2 characters).';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter a valid email address.';
}
if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
    $errors['phone'] = 'Phone must be 10 to 15 digits.';
}
if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
    $errors['password'] = 'Password must be at least 8 characters with a letter and a number.';
}
if ($errors) {
    throw new HttpError('Please correct the highlighted fields.', 422, $errors);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $accountNumber = run_in_transaction(function (PDO $pdo) use ($fullName, $email, $phone, $hash) {
        $stmt = $pdo->prepare("INSERT INTO customer (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)");
        $stmt->execute([$fullName, $email, $phone, $hash]);
        $customerId = (int) $pdo->lastInsertId();

        // Make a unique 12-digit account number (retry if it already exists).
        $check = $pdo->prepare("SELECT 1 FROM account WHERE account_number = ?");
        do {
            $number = '1001' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
            $check->execute([$number]);
        } while ($check->fetchColumn());

        $stmt = $pdo->prepare("INSERT INTO account (customer_id, account_number, account_type, balance)
                               VALUES (?, ?, 'SAVINGS', 0.00)");
        $stmt->execute([$customerId, $number]);
        return $number;
    });
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {   // duplicate email or phone (UNIQUE constraint)
        throw new HttpError('An account with this email or phone already exists.', 409);
    }
    throw $e;
}

json_ok('Registration successful. You can now log in.', ['account_number' => $accountNumber], 201);
