# Archived: full-stack phase (up to 2026-11-20)

Not used by the prototype. Kept so the earlier work isn't lost; safe to delete.

- `services/api/`: FastAPI backend (email one-time-code sign-in, sessions and CSRF, shops and
  roles, envelope encryption with epoch keys, retention sweeps, pickup verification) and its
  192 tests. It needed Postgres, SeaweedFS and Mailpit from `docker-compose.yml`.
- `infra/`, `docker-compose.yml`: local services for the API.
- `docs/`: product and architecture review, retention and deletion design, the M1 plan and the
  review packs with screenshots.
- `web-removed/`: web pages and API client code that depended on the backend.

To run it again you would restore these folders to their original places (`services/`,
`docker-compose.yml` and `infra/` at the repository root) and follow the setup in the archived
docs. The prototype in `apps/web` doesn't need any of it.
