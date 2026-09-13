# Financial District

Status: `LOCAL RUNTIME PROVEN / PAYMENT RAILS DISABLED / TAX EXPORT NOT FILED`

The 11th canonical Pauli's Place district holds Revenue Hall, Treasury and Payments, Cost and Tokenomics, Accounting and Close, Tax Office and Executive Finance. It normalizes build/model/tool/infrastructure receipts, money-event records, double-entry journals and tax-review evidence.

`financial-controller` owns normalization, reconciliation queues and executive summaries. A future human accountant receives a named, least-privilege grant through `accountant-role.json`; no generic accountant login or standing vendor access exists. Read, prepare, approve, move money and file are separate capabilities. Bambú's House remains outside this district, off the map, non-enumerable and Pi-only.

The runtime is Python standard library + SQLite except AES-GCM House code, and it creates no network listener. Payment adapters are database-constrained to disabled/sandbox only. Unknown cost is never zero. Tax packages are stamped `PREPARED_FOR_PROFESSIONAL_REVIEW_NOT_FILED`.

Run:

```bash
python3 -m unittest test/test_financial_district.py -v
python3 -m financial_district.cli --db /tmp/finance.db init --tenant pauli-place --legal-entity "OWNER REVIEW REQUIRED"
python3 -m financial_district.cli --db /tmp/finance.db ingest-receipt departments/financial/examples/build-receipt.json
```
