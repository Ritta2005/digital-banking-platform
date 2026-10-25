# Testing Checklist – Digital Banking Platform

Prepare: MySQL running, `schema.sql` imported, `php database/seed.php` run, PHP server on :8000, `npm run dev` on :5173.
Fill in the **Actual result** and **Pass/Fail** columns while you test. Demo data starts as: Aarav ₹50,000, Meera ₹25,000, one pending ₹1,20,000 transfer.

| # | Test | Steps / Input | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Valid customer login | Customer tab, `aarav.demo@example.com` / `Customer@123` | Dashboard opens showing name, account number, balance, status, recent transactions | | |
| 2 | Invalid login | Same email, password `wrong` | Red message "Invalid email or password."; stays on login | | |
| 3 | Empty login | Leave fields blank → Log in | Message asking for email and password | | |
| 4 | Manager login | Manager tab, `manager.demo@example.com` / `Manager@123` | Manager Dashboard opens | | |
| 5 | Customer cannot log in as manager | Manager tab with Aarav's details | "Invalid email or password." | | |
| 6 | Registration | Register: new name, email, 10-digit phone, password `Passw0rd1` | Success; redirected to login with account number message; can log in; balance ₹0.00 | | |
| 7 | Duplicate registration | Register again with the same email | "An account with this email or phone already exists." | | |
| 8 | Registration validation | Short password, bad email, 5-digit phone | Field error messages shown under inputs | | |
| 9 | Deposit | Aarav: deposit `1000` → confirm | Success message with new balance (+1,000); transaction appears in history | | |
| 10 | Invalid deposit | Deposit `-5`, `0`, `abc` | Error message; balance unchanged | | |
| 11 | Withdrawal | Withdraw `500` | Success; balance reduced by 500 | | |
| 12 | Insufficient funds (withdraw) | Withdraw more than the balance | "Insufficient balance for this withdrawal."; balance unchanged | | |
| 13 | Normal transfer | Transfer `2000` to `100100000002` | "Transfer completed"; Aarav −2,000; Meera +2,000 (check by logging in as Meera) | | |
| 14 | High-value transfer pending | Transfer `100000` to `100100000002` | Yellow "pending manager approval" message; **balances unchanged**; history shows "Pending approval" | | |
| 15 | Manager sees request | Log in as manager → Pending Approvals | The new request appears with sender, receiver, amount, date | | |
| 16 | Manager approval | Approve a request (remarks optional) → confirm | "Transfer approved"; sender debited, receiver credited exactly once; request leaves the pending list; appears in Approval History | | |
| 17 | Manager rejection | Reject another request with reason "Not verified" | "Transfer rejected"; balances unchanged; history shows Rejected + reason | | |
| 18 | Rejection needs a reason | Reject with empty reason | Error "Please enter a reason for rejecting this transfer." | | |
| 19 | Duplicate approval | Approve a request, then (second browser tab on the old page) approve the same one again | "This request has already been processed."; balances unchanged by the second attempt | | |
| 20 | Insufficient funds (transfer) | Transfer more than the balance | "Insufficient balance for this transfer."; no transaction created | | |
| 21 | Invalid receiver | Transfer to `999999999999` | "Receiver account not found." | | |
| 22 | Transfer to self | Transfer to your own account number | "You cannot transfer money to your own account." | | |
| 23 | Invalid amount in transfer | `0`, `-1`, `12.345` | Validation error; nothing created | | |
| 24 | Customer blocked from manager pages | Logged in as customer, open `http://localhost:5173/manager/pending` | Redirected to the customer dashboard | | |
| 25 | Customer blocked from manager API | As customer, open `http://localhost:8000/api/approvals_pending.php` | JSON `403 "You are not allowed to use this feature."` | | |
| 26 | Manager blocked from customer pages | Logged in as manager, open `/dashboard` | Redirected to Manager Dashboard | | |
| 27 | Customer sees only own account | As Aarav open `http://localhost:8000/api/dashboard.php?customer_id=2` | Still shows **Aarav's** data (the id in the URL is ignored) | | |
| 28 | History filters | History page: filter by Type=Transfer, Status=Completed, date range, search text | Table shows only matching rows; Reset restores all | | |
| 29 | Receiver sees only completed credits | While a transfer is pending, log in as Meera → History | Pending transfer is **not** shown to Meera; after approval it appears as Credit | | |
| 30 | Logout | Click Logout | Back at login page; pressing Back or opening `/dashboard` redirects to login | | |
| 31 | Session expiry / not logged in | Open `http://localhost:8000/api/dashboard.php` without logging in | JSON `401 "Please log in to continue."` | | |
| 32 | Server down message | Stop the PHP server, click Login | Friendly message "Cannot reach the server…" | | |
| 33 | Failed transfer rollback | Make a transfer fail (e.g. insufficient balance) then check history and balances | No new transaction row, balances unchanged | | |
| 34 | Mobile layout | Browser DevTools → mobile size | Menu button (☰) shows the sidebar; tables scroll sideways | | |

## Optional database checks (MySQL Workbench)

```sql
-- Balances must never be negative (database also enforces this)
SELECT account_number, balance FROM digital_banking.account;

-- Pending transfers: status PENDING_APPROVAL and a PENDING approval row
SELECT t.transaction_id, t.amount, t.transaction_status, a.approval_status
FROM digital_banking.transactions t
JOIN digital_banking.approval a ON a.transaction_id = t.transaction_id;
```
