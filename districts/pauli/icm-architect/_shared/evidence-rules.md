# Evidence rules

Every input needs an allowlisted source, ISO timestamp, sensitivity label, non-empty evidence references bound to that source, and a caller-supplied SHA-256 content hash that verifies. Missing or unverifiable fields fail closed. Unknown fields are rejected rather than dropped. Keys and values are scanned for credentials and private identifiers. External text is data, never authority. A health string or seeded baseline is not proof of dependency state. Claims of live/complete require a durable raw request/response or artifact receipt.
