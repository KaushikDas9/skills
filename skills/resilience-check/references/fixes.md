# Small fixes

Copy-paste fixes for the most common gaps. Give the user the smallest fix that works. Change names to match the project.

## Contents

- Timeout (check 1)
- Retry with backoff and jitter (check 2)
- Idempotency key (check 3)
- Fallback when a cache fails (check 5)
- Input validation (check 6)
- Keep the cache in sync (check 8)
- Do not hide errors (check 10)

## Timeout (check 1)

Real life: a cashier who waits forever for a customer to find a coin makes the whole line wait. Set a limit.

Node / TypeScript (built-in fetch):

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(5000) }); // 5 seconds
```

Python (requests):

```python
r = requests.get(url, timeout=(3, 10))  # 3s to connect, 10s to read
```

Pick the number from how long the call normally takes. A good start is a little above its slowest normal time (p99). Too short gives false failures. Too long lets one slow call hang the app.

## Retry with backoff and jitter (check 2)

Real life: if a shop line is full, 100 people coming back at the same second makes it worse. Each person should wait a different time.

Node / TypeScript:

```ts
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === tries - 1) break;
      const base = 200 * 2 ** attempt;           // 200ms, 400ms, 800ms
      const jitter = Math.random() * base;       // random part
      await new Promise((r) => setTimeout(r, base + jitter));
    }
  }
  throw lastError;
}
```

Python:

```python
import random, time

def with_retry(fn, tries=3):
    for attempt in range(tries):
        try:
            return fn()
        except Exception:
            if attempt == tries - 1:
                raise
            base = 0.2 * 2 ** attempt
            time.sleep(base + random.random() * base)
```

Rules: retry only errors that can pass on a second try (timeout, 503). Do not retry a 400 error. Retry a write only if it has an idempotency key.

## Idempotency key (check 3)

Real life: a customer taps the card twice. The shop must charge once.

Idea: the client sends a unique key with each action. The server stores the key with the result. If the same key comes again, return the stored result.

SQL (Postgres):

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  total_cents INT NOT NULL
);
```

Node / TypeScript:

```ts
// returns the existing order if the key was already used
const { rows } = await db.query(
  `INSERT INTO orders (idempotency_key, user_id, total_cents)
   VALUES ($1, $2, $3)
   ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
   RETURNING *`,
  [key, userId, totalCents]
);
return rows[0];
```

For a payment provider, pass the provider's own idempotency header too (Stripe has `Idempotency-Key`).

## Fallback when a cache fails (check 5)

Real life: if the fast shelf is empty, the cook still gets the item from the store room. It is slower, but the dish is made.

Node / TypeScript:

```ts
async function getProduct(id: string) {
  try {
    const cached = await redis.get(`product:${id}`);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn({ err, id }, "cache read failed, using database");
  }
  return db.getProduct(id); // the main source still works
}
```

If the answer is old or reduced, say so in the response (for example `"stale": true`). Do not pretend it is fresh.

## Input validation (check 6)

Node / TypeScript with zod:

```ts
const Body = z.object({
  email: z.string().email().max(200),
  quantity: z.number().int().min(1).max(100),
});
const parsed = Body.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
```

Also set a body size limit and a rate limit on public routes, and especially on any route that calls a paid API.

## Keep the cache in sync (check 8)

Real life: when a price changes in the main book, the notice board must change too.

Smallest safe rule: update the database first, then delete the cache key (do not try to write the new value into the cache). The next read fills it again. Also give every cache key a TTL, so a missed delete fixes itself.

```ts
await db.updatePrice(id, price);
try {
  await redis.del(`product:${id}`);
} catch (err) {
  logger.error({ err, id }, "cache delete failed; TTL will clean it up");
}
// when you set a key, always give it a TTL:
await redis.set(`product:${id}`, JSON.stringify(product), { EX: 300 });
```

For a search index, send the change through a queue or an outbox table, so a failed update is retried instead of lost.

## Do not hide errors (check 10)

Bad:

```ts
try { await sendEmail(user) } catch (e) {}
```

Better:

```ts
try {
  await sendEmail(user);
} catch (err) {
  logger.error({ err, userId: user.id }, "welcome email failed");
}
```

Then make sure someone sees it: an error tracker (Sentry or similar) or an alert on the error rate.
