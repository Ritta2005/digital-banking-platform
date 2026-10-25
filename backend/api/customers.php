<?php
// backend/api/customers.php
// Manager-only customer CRUD operations.

require_once __DIR__ . '/../helpers/auth.php';

require_role('manager');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_method('GET');

    $stmt = db()->query(
        "SELECT c.customer_id, c.full_name, c.email, c.phone,
                a.account_number, a.balance, a.account_status
         FROM customer c
         LEFT JOIN account a ON c.customer_id = a.customer_id
         ORDER BY c.customer_id DESC"
    );

    json_ok('Customers retrieved successfully.', [
        'customers' => $stmt->fetchAll()
    ]);
}

if ($method !== 'POST') {
    throw new HttpError('Method not allowed.', 405);
}

require_method('POST');

$data = read_json_body();
$action = $data['action'] ?? '';
$pdo = db();

if ($action === 'create') {
    $name = trim($data['full_name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $phone = trim($data['phone'] ?? '');
    $password = $data['password'] ?? '';

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new HttpError('Enter a valid customer name and email.', 422);
    }

    if (strlen($password) < 8) {
        throw new HttpError('Password must contain at least 8 characters.', 422);
    }

    $check = $pdo->prepare('SELECT customer_id FROM customer WHERE email = ?');
    $check->execute([$email]);

    if ($check->fetch()) {
        throw new HttpError('This email is already registered.', 409);
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO customer (full_name, email, phone, password_hash)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $name,
            $email,
            $phone !== '' ? $phone : null,
            password_hash($password, PASSWORD_DEFAULT)
        ]);

        $customerId = (int) $pdo->lastInsertId();

        // Generate a unique 12-digit account number.
        do {
            $accountNumber = (string) random_int(100000000000, 999999999999);
            $check = $pdo->prepare(
                'SELECT account_id FROM account WHERE account_number = ?'
            );
            $check->execute([$accountNumber]);
        } while ($check->fetch());

        $stmt = $pdo->prepare(
            "INSERT INTO account
                (customer_id, account_number, account_type, balance)
             VALUES (?, ?, 'SAVINGS', 0.00)"
        );
        $stmt->execute([$customerId, $accountNumber]);

        $pdo->commit();
        json_ok('Customer added successfully.', ['customer_id' => $customerId]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

if ($action === 'update') {
    $id = filter_var($data['customer_id'] ?? null, FILTER_VALIDATE_INT);
    $name = trim($data['full_name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $phone = trim($data['phone'] ?? '');

    if (!$id || $name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new HttpError('Enter a valid customer ID, name and email.', 422);
    }

    $check = $pdo->prepare(
        'SELECT customer_id FROM customer WHERE email = ? AND customer_id <> ?'
    );
    $check->execute([$email, $id]);

    if ($check->fetch()) {
        throw new HttpError('That email belongs to another customer.', 409);
    }

    $stmt = $pdo->prepare(
        'UPDATE customer
         SET full_name = ?, email = ?, phone = ?
         WHERE customer_id = ?'
    );
    $stmt->execute([$name, $email, $phone !== '' ? $phone : null, $id]);

    if ($stmt->rowCount() === 0) {
        $check = $pdo->prepare('SELECT customer_id FROM customer WHERE customer_id = ?');
        $check->execute([$id]);

        if (!$check->fetch()) {
            throw new HttpError('Customer not found.', 404);
        }
    }

    json_ok('Customer details updated successfully.');
}

if ($action === 'delete') {
    $id = filter_var($data['customer_id'] ?? null, FILTER_VALIDATE_INT);

    if (!$id) {
        throw new HttpError('Invalid customer ID.', 422);
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT account_id, balance FROM account
             WHERE customer_id = ? FOR UPDATE'
        );
        $stmt->execute([$id]);
        $accounts = $stmt->fetchAll();

        $check = $pdo->prepare('SELECT customer_id FROM customer WHERE customer_id = ?');
        $check->execute([$id]);

        if (!$check->fetch()) {
            throw new HttpError('Customer not found.', 404);
        }

        foreach ($accounts as $account) {
            if ((float) $account['balance'] > 0.00001) {
                throw new HttpError(
                    'Cannot delete a customer whose account has a balance.',
                    409
                );
            }

            $check = $pdo->prepare(
                'SELECT transaction_id FROM transactions
                 WHERE sender_account_id = ? OR receiver_account_id = ?
                 LIMIT 1'
            );
            $check->execute([
                $account['account_id'],
                $account['account_id']
            ]);

            if ($check->fetch()) {
                throw new HttpError(
                    'Cannot delete this customer because transaction history must be preserved.',
                    409
                );
            }
        }

        $stmt = $pdo->prepare('DELETE FROM account WHERE customer_id = ?');
        $stmt->execute([$id]);

        $stmt = $pdo->prepare('DELETE FROM customer WHERE customer_id = ?');
        $stmt->execute([$id]);

        $pdo->commit();
        json_ok('Customer deleted successfully.');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

throw new HttpError('Invalid customer action.', 400);