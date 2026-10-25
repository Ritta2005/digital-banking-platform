<?php
// backend/helpers/transactions_helper.php
// One shared query used by the dashboard and the history page.

require_once __DIR__ . '/bootstrap.php';

/**
 * Returns transactions that involve $accountId.
 * - Sender sees everything (completed, pending, rejected).
 * - Receiver only sees COMPLETED incoming transfers (pending money
 *   is not theirs yet).
 * direction = DEBIT (money out) or CREDIT (money in).
 */
function fetch_transactions(int $accountId, array $filters = [], int $limit = 100): array
{
    $sql = "SELECT t.transaction_id, t.transaction_type, t.amount, t.transaction_status,
                   t.description, t.created_at,
                   sa.account_number AS sender_account_number,
                   ra.account_number AS receiver_account_number,
                   CASE WHEN t.sender_account_id = ? THEN 'DEBIT' ELSE 'CREDIT' END AS direction
            FROM transactions t
            LEFT JOIN account sa ON sa.account_id = t.sender_account_id
            LEFT JOIN account ra ON ra.account_id = t.receiver_account_id
            WHERE (t.sender_account_id = ?
                   OR (t.receiver_account_id = ? AND t.transaction_status = 'COMPLETED'))";
    $params = [$accountId, $accountId, $accountId];

    if (!empty($filters['type'])) {
        $sql .= " AND t.transaction_type = ?";
        $params[] = $filters['type'];
    }
    if (!empty($filters['status'])) {
        $sql .= " AND t.transaction_status = ?";
        $params[] = $filters['status'];
    }
    if (!empty($filters['from'])) {
        $sql .= " AND t.created_at >= ?";
        $params[] = $filters['from'] . ' 00:00:00';
    }
    if (!empty($filters['to'])) {
        $sql .= " AND t.created_at <= ?";
        $params[] = $filters['to'] . ' 23:59:59';
    }
    if (!empty($filters['search'])) {
        $sql .= " AND (t.description LIKE ? OR sa.account_number LIKE ? OR ra.account_number LIKE ?)";
        $like = '%' . $filters['search'] . '%';
        array_push($params, $like, $like, $like);
    }

    $sql .= " ORDER BY t.created_at DESC, t.transaction_id DESC LIMIT ?";

    $stmt = db()->prepare($sql);
    $i = 1;
    foreach ($params as $p) {
        $stmt->bindValue($i++, $p);
    }
    $stmt->bindValue($i, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
