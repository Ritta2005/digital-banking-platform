<?php
// backend/helpers/bootstrap.php
// Every API file starts with:  require_once __DIR__ . '/../helpers/bootstrap.php';
// It sets up: error handling, CORS, session, database connection and
// small helper functions used everywhere (JSON replies, validation, money).

declare(strict_types=1);

$GLOBALS['config'] = require __DIR__ . '/../config/config.php';

// ---------- Errors: log internally, never show details to the user ----------
ini_set('display_errors', '0');
error_reporting(E_ALL);

/** An error we expect (bad input, not logged in...). Carries an HTTP code. */
class HttpError extends Exception
{
    public int $httpCode;
    public array $errors;

    public function __construct(string $message, int $httpCode = 400, array $errors = [])
    {
        parent::__construct($message);
        $this->httpCode = $httpCode;
        $this->errors = $errors;
    }
}

function send_json(array $body, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_ok(string $message, array $data = [], int $code = 200): void
{
    send_json(['success' => true, 'message' => $message, 'data' => $data], $code);
}

set_exception_handler(function (Throwable $e): void {
    if ($e instanceof HttpError) {
        send_json([
            'success' => false,
            'message' => $e->getMessage(),
            'errors'  => $e->errors,
        ], $e->httpCode);
    }
    // Unknown error: save details in the PHP log, show a safe message.
    error_log('[digital-banking] ' . get_class($e) . ': ' . $e->getMessage()
        . ' in ' . $e->getFile() . ':' . $e->getLine());
    send_json(['success' => false, 'message' => 'Something went wrong on the server. Please try again.'], 500);
});

// ---------- CORS (lets React on :5173 call PHP on :8000 with cookies) ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $GLOBALS['config']['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);   // exact origin, not "*"
    header('Access-Control-Allow-Credentials: true');    // needed for cookies
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);   // answer the browser's "preflight" check
    exit;
}

// ---------- Session ----------
session_name('BANKSESSID');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,     // JavaScript cannot read the cookie
    'samesite' => 'Lax',    // fine because localhost:5173 and localhost:8000 are same-site
]);
session_start();

// Idle timeout: if nothing happened for a while, log the user out.
$idle = (int) $GLOBALS['config']['session_idle_seconds'];
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $idle) {
    $_SESSION = [];
    session_destroy();
    session_start();
}
if (isset($_SESSION['user_id'])) {
    $_SESSION['last_activity'] = time();
}

// ---------- Database (PDO) ----------
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = $GLOBALS['config'];
        $dsn = "mysql:host={$c['db_host']};port={$c['db_port']};dbname={$c['db_name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,   // real prepared statements
        ]);
    }
    return $pdo;
}

/** Runs $work inside a DB transaction. Any error => ROLLBACK (nothing is saved). */
function run_in_transaction(callable $work)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $work($pdo);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

// ---------- Request helpers ----------
function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        throw new HttpError('Method not allowed.', 405);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new HttpError('Request body must be valid JSON.', 400);
    }
    return $data;
}

/** Text length / cut that work even if the PHP "mbstring" extension is off. */
function text_len(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s);
}

function text_cut(string $s, int $max): string
{
    return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}

function str_field(array $body, string $key, int $maxLen = 255): string
{
    $v = $body[$key] ?? '';
    return is_string($v) ? text_cut(trim($v), $maxLen) : '';
}

// ---------- Money helpers (we never use float for money) ----------
/** "1234.5" -> 123450 (paise, an integer). Returns null if not a valid amount. */
function amount_to_paise($value): ?int
{
    if (is_int($value) || is_float($value)) {
        $value = (string) $value;
    }
    if (!is_string($value)) {
        return null;
    }
    $value = trim($value);
    if (!preg_match('/^\d{1,10}(\.\d{1,2})?$/', $value)) {
        return null;
    }
    $parts = explode('.', $value);
    $rupees = (int) $parts[0];
    $paise = isset($parts[1]) ? (int) str_pad($parts[1], 2, '0') : 0;
    return $rupees * 100 + $paise;
}

function paise_to_string(int $paise): string
{
    return intdiv($paise, 100) . '.' . str_pad((string) ($paise % 100), 2, '0', STR_PAD_LEFT);
}

/** Reads and validates "amount" from the request. Returns paise (> 0). */
function validated_amount(array $body): int
{
    $paise = amount_to_paise($body['amount'] ?? null);
    if ($paise === null) {
        throw new HttpError('Enter a valid amount (numbers only, up to 2 decimal places).', 422,
            ['amount' => 'Invalid amount.']);
    }
    if ($paise <= 0) {
        throw new HttpError('Amount must be greater than zero.', 422,
            ['amount' => 'Amount must be greater than zero.']);
    }
    return $paise;
}

function get_threshold_paise(): int
{
    $stmt = db()->prepare("SELECT setting_value FROM app_settings WHERE setting_key = ?");
    $stmt->execute(['HIGH_VALUE_THRESHOLD']);
    $value = $stmt->fetchColumn();
    $paise = $value === false ? null : amount_to_paise($value);
    return $paise ?? 2500000;   // fall back to Rs 25,000.00
}
