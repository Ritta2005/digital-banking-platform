<?php
// POST /api/deposit.php   body: amount, description (optional)
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$customerId = require_role('customer');
$body = read_json_body();
$paise = validated_amount($body);
$amount = paise_to_string($paise);
$description = str_field($body, 'description', 255) ?: 'Deposit';

$account = get_customer_account($customerId);

$result = run_in_transaction(function (PDO $pdo) use ($account, $amount, $description) {
    // Lock this account row so nobody else changes the balance at the same time.
    $stmt = $pdo->prepare("SELECT balance, account_status FROM account WHERE account_id = ? FOR UPDATE");
    $stmt->execute([$account['account_id']]);
    $locked = $stmt->fetch();
    if (!$locked || $locked['account_status'] !== 'ACTIVE') {
        throw new HttpError('Your account is not active.', 403);
    }

    $pdo->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?")
        ->execute([$amount, $account['account_id']]);

    $pdo->prepare("INSERT INTO transactions
                   (sender_account_id, receiver_account_id, transaction_type, amount, transaction_status, description)
                   VALUES (NULL, ?, 'DEPOSIT', ?, 'COMPLETED', ?)")
        ->execute([$account['account_id'], $amount, $description]);
    $txnId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT balance FROM account WHERE account_id = ?");
    $stmt->execute([$account['account_id']]);
    return ['transaction_id' => $txnId, 'balance' => $stmt->fetchColumn()];
});

json_ok('Deposit successful.', $result, 201);
