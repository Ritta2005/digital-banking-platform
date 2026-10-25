<?php
// GET /api/dashboard.php  (customer only)
// Name, account, balance, status, 5 recent transactions, threshold.
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/transactions_helper.php';

require_method('GET');
$customerId = require_role('customer');   // id comes from the SESSION, not the browser

$stmt = db()->prepare("SELECT full_name, email FROM customer WHERE customer_id = ?");
$stmt->execute([$customerId]);
$customer = $stmt->fetch();

$account = get_customer_account($customerId);

$stmt = db()->prepare(
    "SELECT COUNT(*) FROM transactions
     WHERE sender_account_id = ? AND transaction_status = 'PENDING_APPROVAL'"
);
$stmt->execute([$account['account_id']]);
$pending = (int) $stmt->fetchColumn();

json_ok('OK', [
    'customer' => $customer,
    'account' => [
        'account_number' => $account['account_number'],
        'account_type' => $account['account_type'],
        'balance' => $account['balance'],
        'account_status' => $account['account_status'],
    ],
    'pending_transfers' => $pending,
    'approval_threshold' => paise_to_string(get_threshold_paise()),
    'recent_transactions' => fetch_transactions((int) $account['account_id'], [], 5),
]);
