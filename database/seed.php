<?php
// database/seed.php
// Creates DEMO data. Run from the project root:   php database/seed.php
// Safe to run many times: it only creates what does not exist yet.
//
// Passwords are hashed with password_hash(), exactly like registration does,
// so the hashes always match the passwords below.
//   aarav.demo@example.com   / Customer@123
//   meera.demo@example.com   / Customer@123
//   manager.demo@example.com / Manager@123

if (php_sapi_name() !== 'cli') {
    exit('Run this file from the command line only.');
}

require_once __DIR__ . '/../backend/helpers/bootstrap.php';

function seed_manager(PDO $pdo, string $name, string $email, string $password): int
{
    $stmt = $pdo->prepare("SELECT manager_id FROM manager WHERE email = ?");
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    if ($id !== false) {
        echo "  Manager already exists: $email\n";
        return (int) $id;
    }
    $pdo->prepare("INSERT INTO manager (full_name, email, password_hash) VALUES (?, ?, ?)")
        ->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    echo "  Created manager: $email\n";
    return (int) $pdo->lastInsertId();
}

/** Returns [account_id, wasCreated]. A new account starts with balance 0.00. */
function seed_customer(PDO $pdo, string $name, string $email, string $phone, string $password, string $accNo): array
{
    $stmt = $pdo->prepare("SELECT c.customer_id, a.account_id FROM customer c
                           LEFT JOIN account a ON a.customer_id = c.customer_id
                           WHERE c.email = ? ORDER BY a.account_id LIMIT 1");
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    if ($row) {
        echo "  Customer already exists: $email\n";
        return [(int) $row['account_id'], false];
    }
    $pdo->prepare("INSERT INTO customer (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)")
        ->execute([$name, $email, $phone, password_hash($password, PASSWORD_DEFAULT)]);
    $customerId = (int) $pdo->lastInsertId();
    $pdo->prepare("INSERT INTO account (customer_id, account_number, account_type, balance) VALUES (?, ?, 'SAVINGS', 0.00)")
        ->execute([$customerId, $accNo]);
    echo "  Created customer: $email (account $accNo)\n";
    return [(int) $pdo->lastInsertId(), true];
}

$pdo = null;
try {
    $pdo = db();
    $pdo->beginTransaction();

    echo "Settings...\n";
    $pdo->prepare("INSERT IGNORE INTO app_settings (setting_key, setting_value, description) VALUES (?, ?, ?)")
        ->execute(['HIGH_VALUE_THRESHOLD', '100000.00', 'Transfers at or above this amount (INR) need manager approval']);

    echo "Users...\n";
    $managerId = seed_manager($pdo, 'Demo Manager', 'manager.demo@example.com', 'Manager@123');
    [$aaravAcc, $aaravNew] = seed_customer($pdo, 'Aarav Demo', 'aarav.demo@example.com', '9000000001', 'Customer@123', '100100000001');
    [$meeraAcc, $meeraNew] = seed_customer($pdo, 'Meera Demo', 'meera.demo@example.com', '9000000002', 'Customer@123', '100100000002');

    // Sample transactions only if BOTH demo accounts are brand new, so that
    // balances always equal the sum of the transactions we insert.
    if ($aaravNew && $meeraNew) {
        echo "Sample transactions...\n";
        $addTxn = function (?int $from, ?int $to, string $type, string $amount, string $status, string $desc, int $daysAgo) use ($pdo): int {
            $pdo->prepare("INSERT INTO transactions
                (sender_account_id, receiver_account_id, transaction_type, amount, transaction_status, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))")
                ->execute([$from, $to, $type, $amount, $status, $desc, $daysAgo]);
            return (int) $pdo->lastInsertId();
        };
        $move = function (int $acc, string $delta) use ($pdo): void {
            $pdo->prepare("UPDATE account SET balance = balance + ? WHERE account_id = ?")->execute([$delta, $acc]);
        };

        $addTxn(null, $aaravAcc, 'DEPOSIT', '60000.00', 'COMPLETED', 'Opening deposit', 20);
        $move($aaravAcc, '60000.00');
        $addTxn(null, $meeraAcc, 'DEPOSIT', '20000.00', 'COMPLETED', 'Opening deposit', 20);
        $move($meeraAcc, '20000.00');
        $addTxn($aaravAcc, null, 'WITHDRAWAL', '5000.00', 'COMPLETED', 'Cash withdrawal', 15);
        $move($aaravAcc, '-5000.00');
        $addTxn($aaravAcc, $meeraAcc, 'TRANSFER', '5000.00', 'COMPLETED', 'Low-value transfer', 10);
        $move($aaravAcc, '-5000.00');
        $move($meeraAcc, '5000.00');

        // A rejected high-value transfer (balances unchanged).
        $rejected = $addTxn($aaravAcc, $meeraAcc, 'TRANSFER', '40000.00', 'REJECTED', 'High-value transfer', 8);
        $pdo->prepare("INSERT INTO approval (transaction_id, manager_id, approval_status, remarks, requested_at, decided_at)
                       VALUES (?, ?, 'REJECTED', 'Purpose not clear; rejected.', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY))")
            ->execute([$rejected, $managerId]);

        // A pending high-value transfer (balances unchanged, waiting for manager).
        $pending = $addTxn($aaravAcc, $meeraAcc, 'TRANSFER', '30000.00', 'PENDING_APPROVAL', 'High-value transfer', 1);
        $pdo->prepare("INSERT INTO approval (transaction_id, approval_status, requested_at)
                       VALUES (?, 'PENDING', DATE_SUB(NOW(), INTERVAL 1 DAY))")
            ->execute([$pending]);
        // Result: Aarav = 50000.00, Meera = 25000.00
    } else {
        echo "Sample transactions skipped (demo accounts already existed).\n";
    }

    $pdo->commit();
    echo "Seed finished OK.\n";
} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Seed failed. Is MySQL running and is database/schema.sql imported? Details: " . $e->getMessage() . "\n");
    exit(1);
}
