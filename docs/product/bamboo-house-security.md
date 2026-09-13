# Bambú's House Security Model

Status: `LOCAL SECURITY PROOF / EMPTY HOUSE / NO PERSONAL FILES INGESTED / NO CLOUD DEPLOYMENT`

Bambú's House is a separate personal zone, not an ordinary Financial District room and not part of Tyshawn's AfroMations tenant. It is defined here only because the Financial District architecture needs a private-owner lane. Production must live in Bambú's own StarNet/data plane, separate from Tyshawn, company books and multiplayer project rooms.

## Only principal

The only application principal is `pi-personal-agent`. The house rejects construction/open before any database metadata can be queried when the actor differs. There is no users table, roles table, membership endpoint, search index, service account, admin override or delegation method. `delegate()` always records denial and raises. Pi's normal fleet identity and its house identity must use separate keys and processes in production.

The owner can authorize what Pi does with a record, but authorization does not turn another agent into a house principal. Other agents receive only owner-approved, purpose-limited derived facts through an export gate that is not implemented tonight. No raw record, file name, count, ID or existence signal leaves the house.

## Isolation target

Production design requires a dedicated project/account or hardened isolated host; separate database, object storage, encryption keys, backups, logs, network policy and secret store; no shared vector index; no fleet analytics; no cross-tenant queries; egress denied by default. Pi talks to the ordinary city through a narrow broker carrying opaque task/result IDs. The house is not registered in general room discovery.

## Encryption

The local proof uses AES-256-GCM with a fresh 96-bit nonce for every record and blob and binds record ID/type as authenticated associated data. The key is injected as bytes and is never stored in SQLite. Production requires a non-exportable KMS/HSM key, envelope-encrypted per-record data keys, independent backup key policy and tested key rotation/recovery. Searchable fields are intentionally minimal; production metadata should be encrypted or keyed-hash indexed.

## Audit

Every open, close, list, read, write, blob access, not-found and denied integrity/delegation event enters an append-only log. Record targets are HMACed, not written in plaintext. Entries form an HMAC hash chain and can be verified. SQLite triggers reject audit update/delete. Production copies the chain to tenant-owned immutable/WORM storage and alerts Bambú on integrity failure or denied access, without sending asset details.

## Records

`bamboo_house/asset.schema.json` covers real property, African and other cross-border assets, businesses, financial accounts, vehicles, IP, personal property, insurance, obligations and digital assets. It separates owner assertions, source/professional verification, jurisdiction, title, valuation status, document status, beneficiary/title-transfer state and legal/tax review. Unknown is never treated as proven.

No estate plan, will, trust, beneficiary designation, transfer, filing, valuation, tax conclusion or legal advice is produced by the runtime. The lane inventories evidence and prepares questions/packages for licensed professionals in each relevant jurisdiction.

## Local acceptance proof

- non-Pi actor cannot open the house;
- Pi cannot delegate;
- records/blobs are not plaintext in SQLite;
- wrong key and tampering fail authenticated decryption;
- audit chain verifies and update/delete are blocked;
- every access changes the audit sequence;
- no personal files are present; fixtures are synthetic.

