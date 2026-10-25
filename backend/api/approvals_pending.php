<?php
// GET /api/approvals_pending.php   (manager only)
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');
require_role('manager');

$stmt = db()->query(
    "SELECT ap.approval_id, ap.transaction_id, ap.requested_at,
            t.amount, t.description,
            sa.account_number AS sender_account_number, sc.full_name AS sender_name,
            ra.account_number AS receiver_account_number, rc.full_name AS receiver_name
     FROM approval ap
     JOIN transactions t ON t.transaction_id = ap.transaction_id
     JOIN account sa ON sa.account_id = t.sender_account_id
     JOIN customer sc ON sc.customer_id = sa.customer_id
     JOIN account ra ON ra.account_id = t.receiver_account_id
     JOIN customer rc ON rc.customer_id = ra.customer_id
     WHERE ap.approval_status = 'PENDING'
     ORDER BY ap.requested_at ASC, ap.approval_id ASC"
);

json_ok('OK', [
    'threshold' => paise_to_string(get_threshold_paise()),
    'approvals' => $stmt->fetchAll(),
]);
