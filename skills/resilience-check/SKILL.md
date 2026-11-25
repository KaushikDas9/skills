---
name: resilience-check
description: Audit an app's code for fault tolerance and write a short plain-language report with fixes. Use this skill whenever the user asks if an app will survive failures, crashes, outages or traffic problems, such as a database going down, a slow or failing API, a dead cache, a double click or double payment, a restart in the middle of work, or a cache that shows old data. Also use it for requests like "is my app production ready", "check my vibe coded app before launch", "review my error handling, retries or timeouts", "what happens if Redis or Postgres dies", or "is this app reliable", even if the user does not say "resilience". Can also run safe fault tests on a local copy, never on live users.
---

# Resilience Check

Check if an app keeps working when parts of it break.

Parts always break. A disk dies, an API is slow, a cache crashes. A **fault** is one part breaking. A **failure** is the user seeing the whole app broken. This skill finds the places where a small fault would become a big failure.

> DRAFT v0.1.

## When to use

- "Will my app survive if the database goes down?"
- "Check my vibe coded app before I launch."
- "Review the error handling and retries."
- After the user learns a concept (fault vs failure, retries, cache sync) and wants to see it in real code.

## When NOT to use

- Speed and load testing. This skill is about failure, not capacity.
- Security review. Use `security-review` for that.
- Bug hunting in general. Use `code-review` for that.
- Designing a new system from nothing. Use a system design skill. This skill audits what exists.

## Safety rules (always)

1. **Read-only by default.** Reading code and writing a report changes nothing.
2. **Never break a live system.** Fault tests run only on a local or test copy. If the user points at production, refuse and say why.
3. **Ask before any test that stops or breaks something.** Say what will be stopped, how to undo it, and when to abort. Wait for a yes.
4. **No secrets in the report.** If you see a key or password in code, say "a secret is in file X line Y". Do not print it.
5. **Do not edit the user's code** unless they ask for fixes after reading the report.

## Step 1: Understand the app

Find out, from the code and config:

- Language and framework
- Main database
- Cache, search index, or queue (Redis, Elasticsearch, Kafka, and so on)
- Outside APIs it calls (payments, email, AI, maps)
- How it runs (single process, containers, serverless) and how it restarts
- Where money, logins, or personal data are touched

List these in two lines. If something is unclear, ask the user one short question.

## Step 2: Pick the risk level

The highest risk found sets the level. Do not average.

| Level | When | Checks to run |
|---|---|---|
| Low | Hobby app, internal tool, no money, no personal data | 1, 2, 6, 7, 10 |
| Standard | Real users, accounts, or a database that matters | All 10 |
| High | Payments, logins, personal data, or data that cannot be rebuilt | All 10, and the user must show evidence for 9 |

Say the level and the reason in one line.

One exception to the Low set: if the data cannot be rebuilt (for example, friends' notes, orders, uploads), also give a one-line backup tip, even at Low level. Losing data is the one failure that nobody can undo.

## Step 3: Run the 10 checks

For each check, search the code, then give a rating with evidence (`file:line`). Read `references/search-hints.md` for what to search for in each language. A search hit is a clue, not proof, so read the code around it before you rate.

**Ratings:** `OK`, `WEAK` (exists but has a gap), `MISSING`, `N/A` (the app has no such part).

| # | Check | What to look for in code | Why it matters |
|---|---|---|---|
| 1 | **Timeouts** | Every HTTP call, database call, and queue call has a timeout. Look for fetch, axios, requests, db clients with no timeout option. | No timeout means one slow API can hang the whole app. |
| 2 | **Retries** | Failed calls retry a few times (2 or 3), with a growing wait and random jitter. Look for retry loops with no limit or no wait. | Retry with no wait hammers a sick service and makes it worse. |
| 3 | **Idempotency** | Writes that can be retried or sent twice (orders, payments, emails) use an idempotency key or a unique constraint. | A retry or a double click must not charge twice. |
| 4 | **Database down** | Connection errors are caught. There is a pool limit. The user gets a clear error, not a stack trace or a crash. | The database is the most common single point of failure. |
| 5 | **Optional parts down** | If the cache, search, or a non-core API fails, the app still serves a slower or simpler answer. Look for cache calls with no try/catch or no fallback. | A dead cache should not kill the app. |
| 6 | **Bad input and overload** | Input is validated (empty, huge, wrong type). Rate limits exist on public endpoints. Body size is limited. | One bad request or one noisy client should not take it down. |
| 7 | **Crash and restart** | Something restarts the app by itself (process manager, container policy). State is not kept only in memory. Half-done work can be resumed or repeated safely. | A crash at the wrong moment must not lose or corrupt data. |
| 8 | **Copies in sync** | If data is copied to a cache or search index, the code updates every copy when the main data changes, and handles the case where one update fails. | A forgotten copy shows old data. |
| 9 | **Backups** | Backups exist, run on a schedule, and a restore was tested. | A backup nobody restored is only a hope. |
| 10 | **Visible errors** | Errors are logged with context. No empty `catch` blocks that hide errors. Someone gets an alert for a real outage. | You cannot fix what you cannot see. |

Rules for fair checking:

- Do not mark a check `MISSING` only because a search found nothing. Read the code path first.
- Do not demand circuit breakers or bulkheads for a small app. That is extra machinery for cross-network calls at scale. Add it only if the app has many outside calls and real traffic.
- Do not ask for retries on a write that has no idempotency key. Say "add the key first".
- If a check does not apply, mark `N/A` and say why in one line.

## Step 4: Optional safe fault tests

Only if the user says yes, only on a local or test copy.

For each test, write the plan first and show it:

```
Test:       Stop the database
Hypothesis: The app shows a clear error page and recovers when the database returns.
How:        docker stop <db container> (local only)
Watch:      HTTP status and error message on 3 pages; app logs
Abort if:   Anything outside the test copy is affected
Undo:       docker start <db container>
```

Good first tests:

| Test | Shows |
|---|---|
| Stop the database, then start it | Check 4, 7 |
| Point an API URL to a slow or dead address | Check 1, 2 |
| Stop the cache | Check 5 |
| Send the same order request twice | Check 3 |
| Send empty, huge, and wrong-type input | Check 6 |
| Kill the app process in the middle of a request | Check 7 |

After each test, record: what happened, was the hypothesis true, what to fix.

## Step 5: Write the report

Use short sentences. For each problem, give a real-life example and a technology example, so a reader who is new to the idea understands it.

```
# Resilience report: <app name>
Risk level: <Low | Standard | High> (<one-line reason>)
Date: <date>

## Summary
<2 or 3 sentences. How ready is it? What is the biggest danger?>

## Scorecard
| # | Check | Rating | Where |
|---|---|---|---|
| 1 | Timeouts | WEAK | api/pay.ts:42 |
...

## Top problems (most dangerous first)
### 1. <Problem in plain words>
- Where: file:line
- Real life: <short example, e.g. a shop with one cashier and no backup>
- In this app: <what happens when it breaks>
- Fix: <the smallest change that fixes it>

## What is already good
<1 to 3 items. Be fair.>

## Tests run (if any)
<table: test, result>

## Not checked
<anything skipped and why>
Security is not covered by this report (for example, who may call an endpoint, or who sets a price). If you noticed such a problem, name it in one line and suggest running `security-review`.
```

Rank problems by danger: data loss or double charge first, then full outage, then bad user experience.

## Style rules

- Plain, short sentences. The reader may not be a native English speaker.
- Explain each term once, the first time it appears.
- Real-life example first, then the technology example.
- Give the smallest fix. Do not suggest a big rewrite or a new tool when a one-line timeout fixes it. `references/fixes.md` has copy-paste code for the common fixes (timeout, retry with jitter, idempotency key, cache fallback, validation, cache sync, visible errors). Adapt it to the project's language.
- Message queues and background jobs: treat them as outside parts. Check for a retry limit, a dead-letter place for jobs that keep failing, and safe repeat (check 3 and check 7).
- Report honestly. If a test was skipped, say so. If you are not sure, say so.
- Keep the report short, in proportion to the app. Low risk: about 400 words, at most 5 problems. Standard or High: at most 9 problems, and group small ones in one line. A long report hides the one problem that matters.

## Files in this skill

| File | Read it when |
|---|---|
| `references/search-hints.md` | Step 3, to know what to search for per check and per language |
| `references/fixes.md` | Step 5, when you write the "Fix" line of a problem |
