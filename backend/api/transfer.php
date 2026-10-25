<?php
// POST /api/transfer.php   body: receiver_account_number, amount, description (optional)
//
// Amount BELOW threshold  -> money moves now, status COMPLETED.
// Amount AT/ABOVE threshold -> status PENDING_APPROVAL, an approval row is
//                             created, and NO balance changes until a manager approves.
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$customerId = require_role('customer');
$body = read_json_body();

$paise = validated_amount($body);
$amount = paise_to_string($paise);
$receiverNumber = str_field($body, 'receiver_account_number', 12);
$description = str_field($body, 'description', 255) ?: 'Fund transfer';

if (!preg_match('/^[0-9]{12}$/', $receiverNumber)) {
    throw new HttpError('Enter a valid 12-digit receiver account number.', 422,
        ['receiver_account_number' => 'Account number must be 12 digits.']);
}

$sender = get_customer_account($customerId);   // sender is ALWAYS the logged-in customer

$stmt = db()->prepare("SELECT account_id FROM account WHERE account_number = ?");
$stmt->execute([$receiverNumber]);
$receiverId = $stmt->fetchColumn();
if ($receiverId === false) {
    throw new HttpError('Receiver account not found.', 404, ['receiver_account_number' => 'Account not found.']);
}
$receiverId = (int) $receiverId;
$senderId = (int) $sender['account_id'];
if ($receiverId === $senderId) {
    throw new HttpError('You cannot transfer money to your own account.', 422,
        ['receiver_account_number' => 'Choose a different account.']);
}

$thresholdPaise = get_threshold_paise();

$result = run_in_transaction(function (PDO $pdo) use (
    $senderId, $receiverId, $amount, $paise, $description, $thresholdPaise
) {
    // Lock BOTH accounts, always in the same order (smallest id first),
    // so two transfers going in opposite directions cannot deadlock.
    $ids = [$senderId, $receiverId];
    sort($ids);
    $stmt = $pdo->prepare("SELECT account_id, balance, account_status FROM account
                           WHERE account_id IN (?, ?) ORDER BY account_id FOR UPDATE");
    $stmt->execute($ids);
    $locked = [];
    foreach ($stmt->fetchAll() as $row) {
        $locked[(int) $row['account_id']] = $row;
    }
    if (count($locked) !== 2) {
        throw new HttpError('Receiver account not found.', 404);
    }
    if ($locked[$senderId]['account_status'] !== 'ACTIVE') {
        throw new HttpError('Your account is not active.', 403);
    }
    if ($locked[$receiverId]['account_status'] !== 'ACTIVE') {
        throw new HttpError('The receiver account is not active.', 422);
    }
    if (amount_to_paise($locked[$senderId]['balance']) < $paise) {
        throw new HttpError('Insufficient balance for this transfer.', 422);
    }

    $isHighValue = $paise >= $thresholdPaise;
    $status = $isHighValue ? 'PENDING_APPROVAL' : 'COMPLETED';

    $pdo->prepare("INSERT INTO transactions
                   (sender_account_id, receiver_account_id, transaction_type, amount, transaction_status, description)
                   VALUES (?, ?, 'TRANSFER', ?, ?, ?)")
        ->execute([$senderId, $receiverId, $amount, $status, $description]);
    $txnId = (int) $pdo->lastInsertId();

    if ($isHighValue) {
        // Waiting for a manager. Balances are NOT touched.
        $pdo->prepare("INSERT INTO approval (transaction_id, approval_status) VALUES (?, 'PENDING')")
            ->execute([$txnId]);
    } else {
        $pdo->prepare("UPDATE account SET balance = balance - ? WHERE account_id = ?")
            ->execute([$amount, $senderId]);
        $pdo->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?")
            ->execute([$amount, $receiverId]);
    }

    $stmt = $pdo->prepare("SELECT balance FROM account WHERE account_id = ?");
    $stmt->execute([$senderId]);
    return ['transaction_id' => $txnId, 'status' => $status, 'balance' => $stmt->fetchColumn()];
});

if ($result['status'] === 'PENDING_APPROVAL') {
    json_ok('Transfer submitted. It is pending manager approval and no money has moved yet.', $result, 202);
}
json_ok('Transfer completed successfully.', $result, 201);
