<?php
// backend/helpers/auth.php
// Login checks. Authorization happens HERE on the server, not in React.

require_once __DIR__ . '/bootstrap.php';

/** Returns ['user_id'=>..., 'role'=>...] or stops with 401 if not logged in. */
function require_login(): array
{
    if (empty($_SESSION['user_id']) || empty($_SESSION['role'])) {
        throw new HttpError('Please log in to continue.', 401);
    }
    return ['user_id' => (int) $_SESSION['user_id'], 'role' => (string) $_SESSION['role']];
}

/** Stops with 401 (not logged in) or 403 (wrong role). */
function require_role(string $role): int
{
    $user = require_login();
    if ($user['role'] !== $role) {
        throw new HttpError('You are not allowed to use this feature.', 403);
    }
    return $user['user_id'];
}

/** Call after a successful password check. */
function start_login_session(int $userId, string $role): void
{
    session_regenerate_id(true);   // new session ID = stops session fixation
    $_SESSION['user_id'] = $userId;
    $_SESSION['role'] = $role;
    $_SESSION['last_activity'] = time();
}

/** Finds the (single) account that belongs to the logged-in customer. */
function get_customer_account(int $customerId): array
{
    $stmt = db()->prepare(
        "SELECT account_id, account_number, account_type, balance, account_status
         FROM account WHERE customer_id = ? ORDER BY account_id LIMIT 1"
    );
    $stmt->execute([$customerId]);
    $account = $stmt->fetch();
    if (!$account) {
        throw new HttpError('No account found for this customer.', 404);
    }
    return $account;
}
