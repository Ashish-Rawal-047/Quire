"""Document encryption.

Key hierarchy (envelope encryption, three levels):

    root key ── wraps ──► epoch keys ── wrap ──► per-document data keys ── encrypt ──► objects
    (env var in dev,       (key store, NOT in     (wrapped copy in Postgres;
     KMS in production)     the database or its    useless once its epoch key
                            backups)               is destroyed)

See docs/03-retention-and-deletion.md for what this does and does not protect.
"""
