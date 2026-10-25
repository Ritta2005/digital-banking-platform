<?php
// GET /api/me.php  - who is logged in? (React calls this when the page loads)
require_once __DIR__ . '/../helpers/auth.php';

require_method('GET');
$user = require_login();

$table = $user['role'] === 'manager' ? 'manager' : 'customer';
$idCol = $user['role'] === 'manager' ? 'manager_id' : 'customer_id';
// $table and $idCol come from our own code above, never from the user.
$stmt = db()->prepare("SELECT $idCol AS id, full_name, email FROM $table WHERE $idCol = ?");
$stmt->execute([$user['user_id']]);
$row = $stmt->fetch();
if (!$row) {
    $_SESSION = [];
    throw new HttpError('Please log in to continue.', 401);
}

json_ok('OK', [
    'role' => $user['role'],
    'user' => ['id' => (int) $row['id'], 'full_name' => $row['full_name'], 'email' => $row['email']],
]);
