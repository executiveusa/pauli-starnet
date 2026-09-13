PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS house_meta(k TEXT PRIMARY KEY,v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS encrypted_records(
 record_id TEXT PRIMARY KEY,
 record_type TEXT NOT NULL,
 nonce BLOB NOT NULL,
 ciphertext BLOB NOT NULL,
 aad_sha256 TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS encrypted_blobs(
 blob_id TEXT PRIMARY KEY,
 record_id TEXT NOT NULL,
 nonce BLOB NOT NULL,
 ciphertext BLOB NOT NULL,
 plaintext_sha256 TEXT NOT NULL,
 byte_size INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 FOREIGN KEY(record_id) REFERENCES encrypted_records(record_id)
);
CREATE TABLE IF NOT EXISTS audit_log(
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 occurred_at TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL,
 target_hmac TEXT NOT NULL,
 outcome TEXT NOT NULL,
 reason TEXT,
 previous_hash TEXT NOT NULL,
 entry_hash TEXT NOT NULL UNIQUE
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT,'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT,'audit log is append-only'); END;
