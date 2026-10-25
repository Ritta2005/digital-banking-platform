-- =====================================================================
-- Digital Banking Platform - Smart Transaction Management
-- File: database/schema.sql
-- Needs MySQL 8.0.16+ (CHECK constraints are enforced from that version).
-- SAFE TO RE-RUN: it only creates things that do not exist yet and
-- never drops tables or deletes data.
-- Educational simulation only. NOT real banking software.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS digital_banking
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE digital_banking;

-- Application settings (e.g. the high-value transfer threshold)
CREATE TABLE IF NOT EXISTS app_settings (
    setting_key   VARCHAR(50)  NOT NULL,
    setting_value VARCHAR(100) NOT NULL,
    description   VARCHAR(255) NULL,
    PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

-- Customers
CREATE TABLE IF NOT EXISTS customer (
    customer_id   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL,
    phone         VARCHAR(15)   NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    UNIQUE KEY uq_customer_email (email),
    UNIQUE KEY uq_customer_phone (phone),
    CONSTRAINT chk_customer_phone_len CHECK (CHAR_LENGTH(phone) BETWEEN 10 AND 15)
) ENGINE=InnoDB;

-- Managers
CREATE TABLE IF NOT EXISTS manager (
    manager_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (manager_id),
    UNIQUE KEY uq_manager_email (email)
) ENGINE=InnoDB;

-- Accounts (balance can never be negative)
CREATE TABLE IF NOT EXISTS account (
    account_id     INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    customer_id    INT UNSIGNED   NOT NULL,
    account_number VARCHAR(12)    NOT NULL,
    account_type   ENUM('SAVINGS','CURRENT') NOT NULL DEFAULT 'SAVINGS',
    balance        DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
    account_status ENUM('ACTIVE','FROZEN','CLOSED') NOT NULL DEFAULT 'ACTIVE',
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id),
    UNIQUE KEY uq_account_number (account_number),
    KEY idx_account_customer (customer_id),
    CONSTRAINT fk_account_customer
        FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
    CONSTRAINT chk_account_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

-- Transactions
--   DEPOSIT    : sender is NULL, receiver is set
--   WITHDRAWAL : sender is set,  receiver is NULL
--   TRANSFER   : both set and different
--   PENDING_APPROVAL : a high-value transfer waiting for a manager.
--                      NO balance has changed yet.
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    sender_account_id   INT UNSIGNED  NULL,
    receiver_account_id INT UNSIGNED  NULL,
    transaction_type    ENUM('DEPOSIT','WITHDRAWAL','TRANSFER') NOT NULL,
    amount              DECIMAL(15,2) NOT NULL,
    transaction_status  ENUM('COMPLETED','PENDING_APPROVAL','REJECTED','FAILED')
                        NOT NULL DEFAULT 'COMPLETED',
    description         VARCHAR(255)  NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id),
    KEY idx_txn_sender   (sender_account_id),
    KEY idx_txn_receiver (receiver_account_id),
    KEY idx_txn_created  (created_at),
    KEY idx_txn_type_status (transaction_type, transaction_status),
    CONSTRAINT fk_txn_sender
        FOREIGN KEY (sender_account_id)   REFERENCES account (account_id),
    CONSTRAINT fk_txn_receiver
        FOREIGN KEY (receiver_account_id) REFERENCES account (account_id),
    CONSTRAINT chk_txn_amount CHECK (amount > 0),
    CONSTRAINT chk_txn_shape CHECK (
           (transaction_type = 'DEPOSIT'
                AND sender_account_id IS NULL AND receiver_account_id IS NOT NULL)
        OR (transaction_type = 'WITHDRAWAL'
                AND sender_account_id IS NOT NULL AND receiver_account_id IS NULL)
        OR (transaction_type = 'TRANSFER'
                AND sender_account_id IS NOT NULL AND receiver_account_id IS NOT NULL
                AND sender_account_id <> receiver_account_id)
    )
) ENGINE=InnoDB;

-- Approvals: one row per high-value transfer.
--   PENDING  -> manager_id and decided_at are NULL
--   APPROVED / REJECTED -> manager_id and decided_at are filled in
-- UNIQUE(transaction_id) = at most one approval record per transaction.
CREATE TABLE IF NOT EXISTS approval (
    approval_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    transaction_id  INT UNSIGNED NOT NULL,
    manager_id      INT UNSIGNED NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    remarks         VARCHAR(255) NULL,
    requested_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at      DATETIME     NULL,
    PRIMARY KEY (approval_id),
    UNIQUE KEY uq_approval_transaction (transaction_id),
    KEY idx_approval_manager (manager_id),
    KEY idx_approval_status (approval_status),
    CONSTRAINT fk_approval_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id),
    CONSTRAINT fk_approval_manager
        FOREIGN KEY (manager_id) REFERENCES manager (manager_id),
    CONSTRAINT chk_approval_decision CHECK (
           (approval_status = 'PENDING'
                AND manager_id IS NULL AND decided_at IS NULL)
        OR (approval_status IN ('APPROVED','REJECTED')
                AND manager_id IS NOT NULL AND decided_at IS NOT NULL)
    )
) ENGINE=InnoDB;

-- Default setting. INSERT IGNORE = does nothing if it already exists,
-- so your changed threshold is never overwritten.
INSERT IGNORE INTO app_settings (setting_key, setting_value, description)
VALUES ('HIGH_VALUE_THRESHOLD', '25000.00',
        'Transfers at or above this amount (INR) need manager approval');
