# Media Storage

S3-compatible blob storage used by avatar uploads (`POST /api/v1/users/me/avatar`) and any future media surfaces (lease PDFs, document attachments). Three drop-in backends are supported with zero code change: AWS S3, Cloudflare R2, self-hosted MinIO. Selection is purely env-driven at startup; runtime behavior is identical.

## Selector logic

Bootstrap in `server.rs` builds the storage trait object from `ServerConfig.s3` (`crates/api/src/common/config.rs`):

- **`S3_BUCKET` unset** -> `StubMediaStorage` is wired up. Uploads are logged but not persisted; reads of `avatars/...` keys return a `data:image/svg+xml` placeholder so the frontend can still render something. A `media_storage_stub` warning is emitted at startup as a single source of truth for "this process has no real media backend".
- **`S3_BUCKET` set, any of `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` missing** -> startup **fails fast** with `ServerError::EnvVar("S3_BUCKET set but $name missing")`. This is intentional: silent fallback to Stub in production would mask broken media in a deploy that "looks healthy" (HTTP 200 on `/health`).
- **All five required vars present** -> `S3MediaStorage` is wired up with path-style addressing forced on; `S3_PUBLIC_URL_BASE` defaults to `${S3_ENDPOINT}/${S3_BUCKET}` if unset.

## Environment Variables

`S3_BUCKET` is the master gate: when set, all other `S3_*` (except `S3_PUBLIC_URL_BASE`) become required and missing values fail-fast at startup.

| Variable             | Required | Description                                                          |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `S3_BUCKET`          | gate     | Unset -> Stub fallback.                                              |
| `S3_REGION`          | yes      | `us-east-1` (AWS), `auto` (R2), any (MinIO).                         |
| `S3_ENDPOINT`        | yes      | S3 API URL. See backend matrix.                                      |
| `S3_ACCESS_KEY`      | yes      | API access key (`SecretString`).                                     |
| `S3_SECRET_KEY`      | yes      | API secret key (`SecretString`).                                     |
| `S3_PUBLIC_URL_BASE` | no       | URL prefix for `users.avatar_url`. Default: `${endpoint}/${bucket}`. |

## Backend matrix

### AWS S3

```env
S3_BUCKET=my-app-prod-uploads
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_ACCESS_KEY=AKIA...                # IAM user with s3:PutObject on the bucket
S3_SECRET_KEY=...
# Optional: virtual-hosted-style public URLs
S3_PUBLIC_URL_BASE=https://my-app-prod-uploads.s3.us-east-1.amazonaws.com
```

The `S3_ENDPOINT` stays in path-style form for SIGv4 signing (`with_path_style()` is hardcoded; see [Endpoint addressing](#endpoint-addressing)). For browser-facing URLs you can still choose virtual-hosted-style via `S3_PUBLIC_URL_BASE`. Bucket needs a public-read policy or AWS will return 403 on browser GET despite the per-object `x-amz-acl: public-read`.

### Cloudflare R2

```env
S3_BUCKET=media-assets
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_URL_BASE=https://pub-<bucket-id>.r2.dev
```

R2 ignores the `x-amz-acl: public-read` header on PUT; public access is controlled exclusively by bucket-level "Public Bucket" setting in the Cloudflare dashboard. Upload still succeeds; if the bucket is private, browser GET returns 403. `S3_PUBLIC_URL_BASE` must be set explicitly because the R2 public hostname differs from the S3 API endpoint (`pub-...r2.dev` vs `<account>.r2.cloudflarestorage.com`).

### MinIO (self-hosted)

```env
S3_BUCKET=leasefi-media
S3_REGION=us-east-1                  # MinIO accepts any non-empty value
S3_ENDPOINT=http://minio:9000        # docker-compose internal hostname
S3_ACCESS_KEY=...                    # also used as MINIO_ROOT_USER (single source of truth)
S3_SECRET_KEY=...                    # also used as MINIO_ROOT_PASSWORD
S3_PUBLIC_URL_BASE=https://${PROJECT_DOMAIN}/media
```

The local-dev and production deploys reuse the S3 access/secret pair as MinIO root credentials so the two halves cannot drift. See [`deploy/readme.md`](../../deploy/readme.md) for production setup (nginx `/media/` proxy fronting an internal MinIO container) and [`README` in repo root](../../readme.md) for local-dev (`make env-up` brings up MinIO alongside Redis and Supabase). The `minio-init` one-shot container creates the bucket and sets `mc anonymous set download` on it, so anonymous browser GET works without further configuration.

## Endpoint addressing

`S3MediaStorage::new` (`crates/api/src/providers/storage.rs`) calls `Bucket::create_with_path_style`, which forces **path-style URLs** (`http://endpoint/bucket/key`). Virtual-hosted-style addressing (`http://bucket.endpoint/key`) is NOT used for the API call regardless of backend.

Implications:

- MinIO works out of the box (it does not support virtual-hosted-style without DNS wildcards).
- AWS S3 path-style is being deprecated for new buckets but is still functional and signs correctly with SIGv4.
- R2 accepts both styles for the API; path-style was chosen for uniformity.
- The browser-facing URL (in `users.avatar_url`) is independent of the API call style - it is whatever `S3_PUBLIC_URL_BASE` prescribes.

## Object ACL

Every `PUT` issued by `S3MediaStorage` carries `x-amz-acl: public-read`. This is the per-object knob that allows anonymous GET. It is in addition to (not a substitute for) a bucket-level public-read policy:

- AWS S3: bucket policy must permit `s3:GetObject` to `Principal: "*"`, otherwise the ACL is honored only by ACL-aware tooling and browser GET still 403s.
- R2: bucket-level "Public Bucket" setting; the ACL header is silently ignored.
- MinIO: `mc anonymous set download <alias>/<bucket>` makes the bucket publicly readable; `minio-init` does this on first boot for the dev compose.

Future private-media flows (lease PDFs, identity documents) will switch from public-read ACL to presigned-GET URLs with short TTLs. Avatar uploads stay public for performance - rendering a feed of N users is N image tags, not N presign roundtrips.

## Transport-failure handling

If the storage backend is unreachable when the handler PUTs, `S3MediaStorage::put` returns `StorageError::Transport(...)` whose `Display` includes bucket name, endpoint, access key, and the underlying error. The handler maps this to a generic `500 Internal Server Error` with **no body content** sourced from the error - bucket name, endpoint, and credentials never leak to the caller. This is asserted by `crates/api/tests/users_avatar_s3.rs::avatar_upload_with_dead_storage_returns_generic_500`.

## Related

- [`error_handling.md`](error_handling.md) - how `StorageError` flows through `ApiError` to the response body.
- [`security.md`](security.md) - cookie attributes for the upload endpoint's authentication.
- [`../api/users.md`](../api/users.md) - `POST /api/v1/users/me/avatar` request/response contract.
- [`../../deploy/readme.md`](../../deploy/readme.md) - production deployment specifics (nginx `/media/` proxy, GitHub Settings).
