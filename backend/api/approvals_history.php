<?php
// GET /api/approvals_history.php   (manager only) - approved and rejected requests
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');
require_role('manager');

$stmt = db()->query(
    "SELECT ap.approval_id, ap.transaction_id, ap.approval_status, ap.remarks,
            ap.requested_at, ap.decided_at,
            t.amount, t.description,
            sa.account_number AS sender_account_number, sc.full_name AS sender_name,
            ra.account_number AS receiver_account_number, rc.full_name AS receiver_name,
            m.full_name AS manager_name
     FROM approval ap
     JOIN transactions t ON t.transaction_id = ap.transaction_id
     JOIN account sa ON sa.account_id = t.sender_account_id
     JOIN customer sc ON sc.customer_id = sa.customer_id
     JOIN account ra ON ra.account_id = t.receiver_account_id
     JOIN customer rc ON rc.customer_id = ra.customer_id
     LEFT JOIN manager m ON m.manager_id = ap.manager_id
     WHERE ap.approval_status IN ('APPROVED', 'REJECTED')
     ORDER BY ap.decided_at DESC, ap.approval_id DESC
     LIMIT 200"
);

json_ok('OK', ['approvals' => $stmt->fetchAll()]);
