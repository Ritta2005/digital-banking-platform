<?php
// POST /api/withdraw.php   body: amount, description (optional)
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$customerId = require_role('customer');
$body = read_json_body();
$paise = validated_amount($body);
$amount = paise_to_string($paise);
$description = str_field($body, 'description', 255) ?: 'Withdrawal';

$account = get_customer_account($customerId);

$result = run_in_transaction(function (PDO $pdo) use ($account, $amount, $paise, $description) {
    $stmt = $pdo->prepare("SELECT balance, account_status FROM account WHERE account_id = ? FOR UPDATE");
    $stmt->execute([$account['account_id']]);
    $locked = $stmt->fetch();
    if (!$locked || $locked['account_status'] !== 'ACTIVE') {
        throw new HttpError('Your account is not active.', 403);
    }
    // Check the balance AFTER locking, so two requests cannot both pass.
    if (amount_to_paise($locked['balance']) < $paise) {
        throw new HttpError('Insufficient balance for this withdrawal.', 422);
    }

    $pdo->prepare("UPDATE account SET balance = balance - ? WHERE account_id = ?")
        ->execute([$amount, $account['account_id']]);

    $pdo->prepare("INSERT INTO transactions
                   (sender_account_id, receiver_account_id, transaction_type, amount, transaction_status, description)
                   VALUES (?, NULL, 'WITHDRAWAL', ?, 'COMPLETED', ?)")
        ->execute([$account['account_id'], $amount, $description]);
    $txnId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT balance FROM account WHERE account_id = ?");
    $stmt->execute([$account['account_id']]);
    return ['transaction_id' => $txnId, 'balance' => $stmt->fetchColumn()];
});

json_ok('Withdrawal successful.', $result, 201);
