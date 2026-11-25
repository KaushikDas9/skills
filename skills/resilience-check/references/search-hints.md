# Search hints

Use these to find the places to check. A search hit is only a clue. Read the code around it before you give a rating.

## Contents

- Timeouts (check 1)
- Retries (check 2)
- Idempotency (check 3)
- Database errors (check 4)
- Optional parts (check 5)
- Input and limits (check 6)
- Crash and restart (check 7)
- Copies in sync (check 8)
- Backups (check 9)
- Visible errors (check 10)

## Timeouts (check 1)

Find every call that leaves the process: HTTP, database, cache, queue, file download.

| Language | Search for | A gap looks like |
|---|---|---|
| Node / TypeScript | `fetch(`, `axios`, `got(`, `http.request`, `new Pool(`, `createClient(` | `fetch(url)` with no `AbortSignal.timeout(...)`. `axios.get(url)` with no `timeout`. |
| Python | `requests.get`, `requests.post`, `httpx`, `aiohttp`, `psycopg`, `redis.Redis(` | `requests.get(url)` with no `timeout=`. (requests waits forever by default.) |
| Go | `http.Get`, `http.Client{`, `sql.Open` | `http.Get(url)` or a `http.Client{}` with no `Timeout`. |
| Java / Kotlin | `HttpClient`, `RestTemplate`, `OkHttpClient`, `DataSource` | No connect or read timeout set. |

## Retries (check 2)

Search for: `retry`, `retries`, `attempt`, `backoff`, `while (true)`, `for {`, `catch` followed by the same call.

- Good: a small cap (2 or 3), a wait that grows, a random part (jitter).
- Gap: a retry loop with no cap, no wait, or retries on every error (including bad input errors that will never work).
- Libraries that help: `p-retry`, `async-retry` (Node), `tenacity`, `backoff` (Python), `resilience4j` (Java).

## Idempotency (check 3)

Find writes that create something: orders, payments, emails, messages, webhooks.

- Search for: `POST` handlers, `INSERT`, `create(`, `charge`, `sendEmail`, `webhook`.
- Good: an `Idempotency-Key` header or a client request id that is stored, or a unique constraint on a natural key (for example `order_id`).
- Gap: a payment or an order created on every call, with a retry above it or a button the user can click twice.
- Webhooks: the sender often sends the same event twice. Check if the handler stores the event id and skips repeats.

## Database errors (check 4)

- Search for: the db client setup, `connect`, `pool`, `max`, `connectionLimit`, `pool_size`.
- Good: a pool with a maximum, connection errors caught, a clear error returned to the user.
- Gap: the connection opens once at startup and is never reopened. An unhandled error on startup crashes the process. A raw stack trace is returned to the user.
- Serverless: many instances can open too many connections. Look for a pooler or a small pool size.

## Optional parts (check 5)

Optional means: if it fails, the app can still give a useful answer. Cache, search, analytics, recommendations, email.

- Search for: `redis`, `memcached`, `cache.get`, `elasticsearch`, `algolia`, `analytics`, `track(`.
- Good: the call is in a try/catch (or has a fallback) and the code continues without it.
- Gap: `await cache.get(key)` with no catch, on the main request path. If Redis is down, every request fails.

## Input and limits (check 6)

- Search for: request body parsing, `req.body`, `request.json`, route handlers, file upload code.
- Good: a schema check (zod, pydantic, joi, validator), a body size limit, a rate limit on public routes (`express-rate-limit`, `slowapi`, a gateway rule).
- Gap: the code uses input fields directly in a query, a file path, or a loop count. No size limit on uploads. No rate limit on login or on a costly endpoint (for example, one that calls a paid AI API).

## Crash and restart (check 7)

- Look at: `Dockerfile`, `docker-compose.yml` (`restart:`), `Procfile`, `pm2` config, systemd unit, Kubernetes manifests, hosting settings.
- Good: something restarts the app after a crash. Work that takes many steps can be repeated safely, or it saves progress.
- Gap: a job queue held only in a JS array or a Python list. A multi-step write with no transaction. A `process.on('uncaughtException')` that logs and keeps running in a broken state.
- Also check: does the app handle `SIGTERM` (finish the current request, then exit)?

## Copies in sync (check 8)

Find places where the same data lives in two places: main database plus cache, search index, a second database, or a file.

- Search for: where data is written (`update`, `save`, `insert`), then see if the cache or index is also updated or cleared in the same place.
- Good: one code path does the write and the cache/index update. A failed second step is retried or logged. A cache entry has an expiry (TTL) as a safety net.
- Gap: the cache is cleared in some routes but not others. The index is updated after the database write with no handling if the second step fails. Data is copied to the index only once at startup.

## Backups (check 9)

You usually cannot see this in code. Look at: hosting config, database provider settings, scripts, `cron`, docs, CI files.

- Ask the user: Is there a backup? How often? When did you last restore one?
- Rate `OK` only if the user can show a restore test. Rate `WEAK` if there is a backup but no restore test. Rate `MISSING` if the user does not know.

## Visible errors (check 10)

- Search for empty catch blocks: `catch {}`, `catch (e) {}`, `except: pass`, `except Exception: pass`, `_ = err`.
- Search for: `console.log(err)` only (no structure, no context), and `logger`, `sentry`, `datadog`, `alert`.
- Good: errors are logged with context (which user action, which id), and a real outage causes an alert someone sees.
- Gap: errors are swallowed, or the only trace is a `console.log` that nobody reads.
