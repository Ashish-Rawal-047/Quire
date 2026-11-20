# Encryption, retention and deletion

How Quire stores customer documents, when it deletes them, and what it can and cannot delete. Every
behaviour marked **tested** below has an automated test in `services/api/tests/`. This document
describes the server-side services. None of them can be reached over HTTP yet: their routes arrive
with sign-in (M1 onwards), because no route may exist without authorization.

## 1. Key hierarchy

```
root key ──seals──► epoch keys ──wrap──► per-document data keys ──encrypt──► objects in storage
(env var in dev;     (key store: one per    (wrapped copy in Postgres;
 KMS/HSM in prod)     6-hour window, kept    erased on purge)
                      OUT of all backups)
```

| Key | Where it lives | Backed up? | Destroyed |
|---|---|---|---|
| Root key | `QUIRE_MASTER_KEY` (dev). Production: KMS/HSM | Yes (it must survive) | Never. Rotation is planned for Phase 2 |
| Epoch key | Key store: `QUIRE_KEYSTORE_DIR` (dev: `services/api/var/keystore`, one sealed file per epoch) | **No, never** | When its window has closed and every document under it is purged, and never later than its `retain_until` |
| Data key (one per document) | Postgres `documents.wrapped_key`, wrapped by the epoch key | In DB backups, as wrapped bytes | Erased from the live DB on purge. Copies in backups become useless when the epoch key is destroyed |

The filename is encrypted with the document's own data key (`documents.name_sealed`). Once the data
key is gone, so is the filename.

## 2. Upload path: no plaintext on disk

- The API reads the raw request body (`request.stream()`). It never uses multipart form parsing,
  because Starlette spools any file over 1 MB to a temporary file on disk, in plaintext. A test
  fails if any route uses `UploadFile`, `File()`, `Form()` or `request.form()`. **Tested.**
- Each 64 KiB chunk is encrypted as it arrives (AES-256-GCM). Each chunk is authenticated with its
  position, whether it is the last chunk, and the object it belongs to. Truncation, reordering,
  tampering and copying a ciphertext to another document's location are all detected. **Tested.**
- Ciphertext goes to object storage in 5 MiB multipart parts. Peak memory was 12.5 MiB for a
  32 MiB upload, and the test fails above 16 MiB. **Tested.**
- During a 3 MB upload through the real ASGI request path, no temporary file is created, no
  spooled file rolls over to disk, and the temp folder stays empty. A control test shows that the
  same detector catches multipart spooling. **Tested.**
- The type is detected from magic bytes (PDF, PNG, JPEG). An oversized, empty or wrong-type upload
  is aborted, and nothing is left in storage, including an incomplete multipart upload. **Tested.**
- Malware scanning is **not built**. Documents are marked `not_scanned`, never "clean".

## 3. When things are deleted

| Situation | Files purged | Status |
|---|---|---|
| Uploaded, never paid | 24 h after upload | Tested |
| Collected (pickup code verified) | 1 h after pickup | Tested |
| Ready, not collected | 24 h after Ready | Tested |
| Cancelled | 5 min after cancellation | Tested |
| Any paid order (absolute cap) | 72 h after payment | Tested |
| Customer asks to delete | Immediately (`customer_request`) | Service tested. No route yet |

A sweep runs on startup and every 60 s (`QUIRE_RETENTION_SWEEP_SECONDS`). If the API is down,
deletion is late by the downtime and happens at the next startup. Deletion is never skipped.

### What one purge removes (tested)

1. Every object under `docs/{document_id}/`: the encrypted original, and the previews, thumbnails
   and print-ready renders. All derived files are stored under that prefix, encrypted with the same
   data key. The purge checks the prefix is empty afterwards. If it isn't, it fails and retries.
2. The document's scratch folder (`QUIRE_WORKSPACE_DIR/{document_id}`), if one exists. Phase 1 never
   creates one. Phase 2 document conversion must run with this folder on a RAM-backed mount (tmpfs).
3. The wrapped data key and the encrypted filename, from the live database. A database constraint
   makes a purged row with either still present impossible.
4. A `deleted` entry on the customer's access receipt.

The sweep also removes orphans: objects with no stored document, scratch folders with no stored
document, and key-store keys with no live epoch, once they are an hour old. **Tested.**

### Epoch key lifetime (tested)

- An epoch accepts new documents for one 6-hour window. Its `retain_until` is the **latest hard
  expiry of every document wrapped under it**. It is updated whenever a document's expiry is set
  or extended, for example when the order is paid (upload + 24 h becomes payment + 72 h).
- It is destroyed **early**, once the window has closed (plus a 5-minute margin) and every document
  under it has been purged.
- It is destroyed **at the latest** at `retain_until`. Any document still stored at that point is
  purged first.
- The key is removed from the key store *before* the database records the destruction. A failed
  commit can therefore only leave a destroyed key recorded as live, never the reverse.
- Example (in `test_key_expiry.py`): a file uploaded at 11:55, at the end of the 06:00–12:00
  window, and paid 23 h later expires at about day 4, 10:55. A naive "72 h after the window opened"
  rule would destroy its key at day 3, 06:00, while the file is still legitimately needed. The test
  checks the key survives past that point and is destroyed exactly when the file expires.

## 4. What can and cannot be deleted

| Where | What it holds about a document | Deleted? |
|---|---|---|
| Object storage (bucket) | Ciphertext of the original and derived files | **Yes**, on purge. Requires the bucket to have **versioning off** and be **excluded from storage backups**. That is a deployment setting (§6), not something code can enforce |
| Postgres (live) | Wrapped data key, encrypted filename | **Yes**, on purge (tested) |
| Postgres (live) | Order number, shop, settings, sizes, page count, prices, status timeline, access receipt | **Kept** as order history. No document content |
| Postgres **backups / PITR** | Wrapped data key, encrypted filename, metadata as of the backup | **Cannot be deleted from backups.** They become undecryptable when the epoch key is destroyed (tested). Metadata stays until the backup expires |
| Key store | Epoch keys | **Yes**, on the schedule above. Never backed up. If the key store is lost, documents still stored become unreadable; customers re-upload |
| Scratch folders | Phase 2 conversion temp files | **Yes**, on purge and by the orphan sweep (tested) |
| Access receipt (`access_events`) | Actions, times, actor, print mode. Never filenames or content | **Kept, append-only.** A database trigger rejects updates and deletes (tested). Planned retention is 1 year |
| Pickup attempts | Order, shop, staff id, outcome, time | Kept for rate limiting and audit. Planned retention is 90 days (not yet automated) |
| Application logs | Request lines (method, path with order or document UUIDs, status) and sweep counts | **Not deleted by Quire.** Retention is set by the log host. Services never log filenames, contents, pickup codes, keys or customer contact details. Errors are logged by exception type only |
| Emails (Mailpit in dev) | Order number, shop name, status text | Not deleted by Quire. Notifications never include the pickup code or file names |
| Shop PC, Windows spooler, printer storage, paper | Spool data, device job images, prints | **Outside Quire's control.** Phase 2 only. See docs/01 §4.3 |
| Customer or shop device (Download‑Permitted orders only) | The original file, if downloaded | Outside Quire's control. The customer consented and the download is logged |

## 5. Limits and remaining risks

- **Backup window.** Until a document's epoch key is destroyed, someone holding a database backup
  **and** a copy of the key store could unwrap that document's key. The ciphertext is deleted from
  storage and never backed up, so they would also need a copy of the object taken before the purge.
  Worst case, the epoch key outlives an early-deleted document by up to one window + 24 h + 72 h,
  about 4¼ days after upload.
- **Live compromise.** An attacker with the live database, the key store and the bucket at the same
  time can read documents that are still stored (at most 96 h after upload). Encryption limits
  leaks of any one store, not of all three.
- **Memory.** Python cannot reliably wipe plaintext or keys from memory. Buffers are cleared on a
  best-effort basis. Plaintext exists only in memory, one or two 64 KiB chunks at a time during upload.
- **Local key store.** Destroying an epoch key overwrites the file, flushes it and deletes it. SSDs
  and journalling file systems may keep old blocks. Those blocks only hold the epoch key *sealed
  under the root key*, so they are useless without the root key. In production the key store
  should be a service with provider-guaranteed deletion (an HSM, or Vault with key deletion enabled).
- **Root key in an env var** is acceptable for local development only.
- **Clock and sweep timing.** Deletion can run up to one sweep interval (60 s) after a deadline.
  Epoch destruction adds a 5-minute margin after the window closes.
- **Pickup codes** are derived from the root key, so rotating the root key changes every
  outstanding code. Rotation must wait until no order is Ready.

## 6. Deployment requirements (not enforceable in code)

1. Exclude the key-store directory from every backup, snapshot and sync tool. It contains a
   `DO-NOT-BACK-UP.txt` notice.
2. Create the documents bucket with versioning **off** and exclude it from storage backups and
   replication.
3. Keep database backup retention as short as operations allow. Backups older than about 4½ days
   hold only undecryptable document keys.
4. Production: root key in a KMS/HSM. Key store on a service with guaranteed deletion.
