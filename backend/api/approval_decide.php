<?php
// POST /api/approval_decide.php   (manager only)
// body: approval_id, decision ("APPROVE" or "REJECT"), remarks
//
// APPROVE -> debit sender, credit receiver, mark COMPLETED + APPROVED
// REJECT  -> no balance change, mark REJECTED
// Duplicate protection: we lock the approval row, and only continue if it is
// still PENDING. A second call finds it already decided and gets HTTP 409.
require_once __DIR__ . '/../helpers/auth.php';

require_method('POST');
$managerId = require_role('manager');
$body = read_json_body();

$approvalId = filter_var($body['approval_id'] ?? null, FILTER_VALIDATE_INT);
if ($approvalId === false || $approvalId < 1) {
    throw new HttpError('Invalid approval id.', 422);
}
$decision = strtoupper(str_field($body, 'decision', 10));
if (!in_array($decision, ['APPROVE', 'REJECT'], true)) {
    throw new HttpError('Decision must be APPROVE or REJECT.', 422);
}
$remarks = str_field($body, 'remarks', 255);
if ($decision === 'REJECT' && $remarks === '') {
    throw new HttpError('Please enter a reason for rejecting this transfer.', 422,
        ['remarks' => 'A rejection reason is required.']);
}

$message = run_in_transaction(function (PDO $pdo) use ($approvalId, $decision, $remarks, $managerId) {
    // 1) Lock the approval row so only one request can decide it.
    $stmt = $pdo->prepare("SELECT approval_id, transaction_id, approval_status
                           FROM approval WHERE approval_id = ? FOR UPDATE");
    $stmt->execute([$approvalId]);
    $approval = $stmt->fetch();
    if (!$approval) {
        throw new HttpError('Approval request not found.', 404);
    }
    if ($approval['approval_status'] !== 'PENDING') {
        throw new HttpError('This request has already been processed.', 409);
    }

    $stmt = $pdo->prepare("SELECT transaction_id, sender_account_id, receiver_account_id, amount, transaction_status
                           FROM transactions WHERE transaction_id = ? FOR UPDATE");
    $stmt->execute([$approval['transaction_id']]);
    $txn = $stmt->fetch();
    if (!$txn || $txn['transaction_status'] !== 'PENDING_APPROVAL') {
        throw new HttpError('This transfer is no longer pending.', 409);
    }

    if ($decision === 'REJECT') {
        $pdo->prepare("UPDATE transactions SET transaction_status = 'REJECTED' WHERE transaction_id = ?")
            ->execute([$txn['transaction_id']]);
        $pdo->prepare("UPDATE approval SET approval_status = 'REJECTED', manager_id = ?, remarks = ?, decided_at = NOW()
                       WHERE approval_id = ? AND approval_status = 'PENDING'")
            ->execute([$managerId, $remarks, $approvalId]);
        return 'Transfer rejected. No money was moved.';
    }

    // 2) APPROVE: lock both accounts (smallest id first) and re-check everything,
    //    because things may have changed since the customer made the request.
    $senderId = (int) $txn['sender_account_id'];
    $receiverId = (int) $txn['receiver_account_id'];
    $ids = [$senderId, $receiverId];
    sort($ids);
    $stmt = $pdo->prepare("SELECT account_id, balance, account_status FROM account
                           WHERE account_id IN (?, ?) ORDER BY account_id FOR UPDATE");
    $stmt->execute($ids);
    $locked = [];
    foreach ($stmt->fetchAll() as $row) {
        $locked[(int) $row['account_id']] = $row;
    }
    if (count($locked) !== 2
        || $locked[$senderId]['account_status'] !== 'ACTIVE'
        || $locked[$receiverId]['account_status'] !== 'ACTIVE') {
        throw new HttpError('Sender or receiver account is not active. Reject this request instead.', 409);
    }
    if (amount_to_paise($locked[$senderId]['balance']) < amount_to_paise($txn['amount'])) {
        throw new HttpError('Sender no longer has enough balance. Reject this request instead.', 409);
    }

    $pdo->prepare("UPDATE account SET balance = balance - ? WHERE account_id = ?")
        ->execute([$txn['amount'], $senderId]);
    $pdo->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?")
        ->execute([$txn['amount'], $receiverId]);
    $pdo->prepare("UPDATE transactions SET transaction_status = 'COMPLETED' WHERE transaction_id = ?")
        ->execute([$txn['transaction_id']]);
    $upd = $pdo->prepare("UPDATE approval SET approval_status = 'APPROVED', manager_id = ?, remarks = ?, decided_at = NOW()
                          WHERE approval_id = ? AND approval_status = 'PENDING'");
    $upd->execute([$managerId, $remarks !== '' ? $remarks : null, $approvalId]);
    if ($upd->rowCount() !== 1) {
        throw new HttpError('This request has already been processed.', 409);   // extra safety net
    }
    return 'Transfer approved. The money has been moved.';
});

json_ok($message);
