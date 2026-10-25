<?php
// GET /api/transactions.php?type=&status=&from=&to=&search=   (customer only)
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/transactions_helper.php';

require_method('GET');
$customerId = require_role('customer');
$account = get_customer_account($customerId);

$filters = [];

$type = strtoupper(trim((string) ($_GET['type'] ?? '')));
if ($type !== '') {
    if (!in_array($type, ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'], true)) {
        throw new HttpError('Invalid type filter.', 422);
    }
    $filters['type'] = $type;
}

$status = strtoupper(trim((string) ($_GET['status'] ?? '')));
if ($status !== '') {
    if (!in_array($status, ['COMPLETED', 'PENDING_APPROVAL', 'REJECTED', 'FAILED'], true)) {
        throw new HttpError('Invalid status filter.', 422);
    }
    $filters['status'] = $status;
}

foreach (['from', 'to'] as $key) {
    $value = trim((string) ($_GET[$key] ?? ''));
    if ($value !== '') {
        $d = DateTime::createFromFormat('Y-m-d', $value);
        if (!$d || $d->format('Y-m-d') !== $value) {
            throw new HttpError("Invalid '$key' date. Use YYYY-MM-DD.", 422);
        }
        $filters[$key] = $value;
    }
}

$search = text_cut(trim((string) ($_GET['search'] ?? '')), 50);
if ($search !== '') {
    $filters['search'] = $search;
}

json_ok('OK', [
    'account_number' => $account['account_number'],
    'transactions' => fetch_transactions((int) $account['account_id'], $filters, 200),
]);
