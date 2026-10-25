# Digital Banking Platform – Smart Transaction Management

A **college simulation** of an online bank: customers can deposit, withdraw and transfer
(simulated) money; **high-value transfers (₹1,00,000 or more) wait for a manager's approval**.
Built with **React (Vite) + PHP 8 (PDO) + MySQL 8**.

> ⚠️ Educational project only. It uses fake money and demo data. It is **not** production banking software.

---

## 1. Folder structure

```
digital-banking-platform/
├── README.md
├── .gitignore
├── backend/                      <- PHP API (this folder is the web root)
│   ├── config/
│   │   ├── config.php            <- DB + CORS settings (defaults = XAMPP style)
│   │   └── config.example.php    <- copy to config.local.php for YOUR password
│   ├── helpers/
│   │   ├── bootstrap.php         <- CORS, session, DB connection, JSON, money helpers
│   │   ├── auth.php              <- login checks + role checks
│   │   └── transactions_helper.php
│   └── api/                      <- one file per endpoint
│       ├── register.php  login.php  manager_login.php  logout.php  me.php
│       ├── dashboard.php  deposit.php  withdraw.php  transfer.php  transactions.php
│       └── approvals_pending.php  approvals_history.php  approval_decide.php
├── database/
│   ├── schema.sql                <- creates DB + tables (safe to re-run)
│   └── seed.php                  <- creates demo users (safe to re-run)
├── docs/
│   ├── PROJECT_REPORT.md
│   └── TESTING_CHECKLIST.md
└── frontend/                     <- React + Vite
    ├── package.json  vite.config.js  index.html
    └── src/
        ├── main.jsx  App.jsx
        ├── components/  (Layout, ProtectedRoute, TransactionTable, StatusBadge, Alert, Loading, EmptyState)
        ├── pages/       (Login, Register, Dashboard, MoneyOps, Transfer, History,
        │                 ManagerDashboard, PendingApprovals, ApprovalHistory)
        ├── context/AuthContext.jsx
        ├── services/    (api.js, format.js)
        └── styles/index.css
```

## 2. What you need installed (Windows)

| Software | Notes |
|---|---|
| **MySQL 8** + **MySQL Workbench** | Service must be running, port 3306. |
| **PHP 8.2** (XAMPP's PHP is fine) | e.g. `C:\xampp\php\php.exe`. Only PHP is needed, not Apache. |
| **Node.js 18+** | Check with `node -v`. |
| **VS Code** | Terminal: Terminal → New Terminal. |

Check PHP in a terminal:

```
php -v
```

If you see *"'php' is not recognized"*, either add `C:\xampp\php` to your Windows PATH, or type the full path
everywhere below, e.g. `C:\xampp\php\php.exe -v`.

Make sure these lines are enabled (no `;` in front) in `C:\xampp\php\php.ini` (they are by default in XAMPP):

```
extension=pdo_mysql
extension=mysqli
```

> If XAMPP's own MySQL/MariaDB is also running on port 3306, stop it in the XAMPP Control Panel so it does not clash with MySQL 8.

## 3. Set up the database (MySQL Workbench)

1. Open **MySQL Workbench** and connect to your local server.
2. **File → Open SQL Script…** and choose `database/schema.sql`.
3. Click the **lightning bolt** ⚡ to run it. This creates the database `digital_banking` and all tables.
   It is safe to run again: it never drops tables or deletes data.

## 4. Tell PHP your MySQL password

The default settings in `backend/config/config.php` are user `root` with an **empty** password.
If your MySQL root user has a password (most MySQL 8 installs do):

1. Copy `backend/config/config.example.php` to **`backend/config/config.local.php`**
   (File Explorer: copy and rename, or in a terminal from the project root:
   `copy backend\config\config.example.php backend\config\config.local.php`).
2. Open `config.local.php` and put your password in `'db_pass'`.

`config.local.php` is listed in `.gitignore`, so your password never goes to GitHub.

## 5. Create the demo accounts

Open a terminal in the **project root** (`digital-banking-platform`) and run:

```
php database/seed.php
```

You should see lines like `Created customer: aarav.demo@example.com`. Running it again is safe – it only creates what is missing.
Passwords are hashed with PHP's `password_hash()`, the same way registration does it.

| Role | Email | Password |
|---|---|---|
| Customer | aarav.demo@example.com | Customer@123 |
| Customer | meera.demo@example.com | Customer@123 |
| Manager | manager.demo@example.com | Manager@123 |

Demo data: Aarav ₹50,000 (account `100100000001`), Meera ₹25,000 (account `100100000002`),
one completed transfer, one **pending** ₹30,000 transfer, and one rejected ₹40,000 transfer.

## 6. Start the PHP backend (keep this terminal open)

From the project root:

```
php -S localhost:8000 -t backend
```

(With XAMPP only: `C:\xampp\php\php.exe -S localhost:8000 -t backend`)

Quick check – open <http://localhost:8000/api/me.php> in a browser. You should see JSON saying
`"Please log in to continue."` – that means PHP works.

## 7. Start the React frontend (a second terminal)

```
cd frontend
npm install
npm run dev
```

Open **<http://localhost:5173>**. Use `localhost` for the website (not a different address) so the login cookie is shared with the PHP server.

> You already had a Vite project in `frontend/`. Replace it with this one, or copy these `src/` files and `package.json` over it.
> Keep a backup of your old folder if you want.

## 8. Demo script (5 minutes)

1. Log in as **Aarav** → dashboard shows balance ₹50,000 and a pending transfer.
2. **Deposit & Withdraw**: deposit ₹1,000, withdraw ₹500 (watch the balance change).
3. **Transfer Money**: send ₹2,000 to `100100000002` → completes immediately.
4. Transfer ₹1,00,000 or more to `100100000002` → status **Pending approval**, balance unchanged.
5. Log out. Log in as **Manager** → **Pending Approvals** → approve one, reject another (reason required).
6. Log in as Aarav / Meera → balances updated only for the approved transfer; history shows Completed / Rejected.
7. Try something invalid: withdraw more than the balance, deposit `-5`, wrong password, unknown receiver.

Change the approval threshold (optional) in MySQL Workbench:

```sql
UPDATE digital_banking.app_settings SET setting_value = '10000.00' WHERE setting_key = 'HIGH_VALUE_THRESHOLD';
```

## 9. How it works (short)

- **Login:** PHP checks the password with `password_verify()`, starts a **session** and regenerates the session ID. The browser keeps only a cookie.
- **Security:** every protected API checks the session and the **role** on the server. The browser never sends a user ID; PHP uses the logged-in user from the session.
- **Money safety:** every money operation runs in a **database transaction** and locks the account rows (`SELECT ... FOR UPDATE`). If anything fails, everything is rolled back.
- **Approvals:** a transfer ≥ threshold is saved as `PENDING_APPROVAL` with an `approval` row and **no balance change**.
  On approval PHP locks the approval row, re-checks balance and status, moves the money once and marks the approval `APPROVED`.
  A second click or second request gets HTTP 409 *"already processed"*.
- **Amounts:** stored as `DECIMAL(15,2)`; PHP converts to whole paise for comparisons (no floating point).

## 10. API reference

All URLs start with `http://localhost:8000/api/`. Every reply looks like `{ "success": true/false, "message": "...", "data": {...} }`.

| Endpoint | Method | Who | Purpose |
|---|---|---|---|
| `register.php` | POST | public | Create customer + account |
| `login.php` / `manager_login.php` | POST | public | Log in |
| `logout.php` | POST | any | Log out |
| `me.php` | GET | logged in | Current user and role |
| `dashboard.php` | GET | customer | Balance, account, recent transactions |
| `deposit.php`, `withdraw.php` | POST | customer | `amount`, optional `description` |
| `transfer.php` | POST | customer | `receiver_account_number`, `amount`, optional `description` |
| `transactions.php` | GET | customer | Filters: `type`, `status`, `from`, `to`, `search` |
| `approvals_pending.php` | GET | manager | Pending list |
| `approval_decide.php` | POST | manager | `approval_id`, `decision` (`APPROVE`/`REJECT`), `remarks` |
| `approvals_history.php` | GET | manager | Decided requests |

HTTP codes used: 200/201 success, 202 transfer accepted but pending, 400 bad JSON, 401 not logged in,
403 wrong role, 404 not found, 405 wrong method, 409 already processed, 422 validation error, 500 server error.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `'php' is not recognized` | Use the full path (`C:\xampp\php\php.exe`) or add `C:\xampp\php` to PATH, then reopen the terminal. |
| `could not find driver` | Enable `extension=pdo_mysql` in `php.ini`, restart the PHP server. |
| Seed says `Access denied for user 'root'` | Wrong password: edit `backend/config/config.local.php`. |
| Seed says `Unknown database` / `table doesn't exist` | Run `database/schema.sql` in Workbench first. |
| Page shows *"Cannot reach the server"* | PHP server not running (step 6), or MySQL not running. Keep the PHP terminal open. |
| Login works but next page says "Please log in" | Cookie not saved. Open the site as `http://localhost:5173` (same host name for site and API) and clear the site's cookies. |
| CORS error in the browser console | Frontend must run on port 5173 (`strictPort` is on). If you use another port, add it to `allowed_origins` in `backend/config/config.php`. |
| Port 8000 or 5173 already in use | Close the older terminal that is using it. |
| *"Something went wrong on the server"* | Look at the PHP terminal – the real error message is printed there (users never see it). |
| `npm install` fails | Check `node -v` (needs 18+) and your internet connection. |
| Session expired message | You were idle for 30 minutes (`session_idle_seconds`). Just log in again. |
| Want a fresh database | In Workbench: `DROP DATABASE digital_banking;` then repeat steps 3 and 5. |

## 12. Push to GitHub safely

```
git add .
git status          (check that config.local.php and node_modules are NOT listed)
git commit -m "Digital Banking Platform"
git push
```

`.gitignore` already protects `config.local.php`, `node_modules`, and build output.

## 13. Limitations

Simulation only: no real payments, no OTP/2FA, one account per customer, no email, no password reset,
no rate-limiting of login attempts, HTTP instead of HTTPS (local only), and no automated test suite
(use `docs/TESTING_CHECKLIST.md`).
