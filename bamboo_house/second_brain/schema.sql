PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS passages(passage_id TEXT PRIMARY KEY,source_file_id TEXT NOT NULL,nonce BLOB NOT NULL,ciphertext BLOB NOT NULL,plaintext_sha256 TEXT NOT NULL,created_at TEXT,ordinal INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS token_index(token_hmac TEXT NOT NULL,passage_id TEXT NOT NULL,PRIMARY KEY(token_hmac,passage_id),FOREIGN KEY(passage_id) REFERENCES passages(passage_id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS token_lookup ON token_index(token_hmac);
