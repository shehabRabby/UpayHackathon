# Multilingual coach investigation

Banglish enforcement now includes a deterministic local U+0980–U+09FF check after structured-output validation and again before the coach write transaction. It covers message and every recommendationText; the strict current schema has no separate recommendation title/description/action fields. Any leak produces the sanitized `banglish_script` diagnostic and a safe error without persisting a new turn or calling Gemini again. Text is not deleted, replaced or transliterated, so financial amounts, dates and metadata cannot be silently altered. Bangla/English have no new restriction. Existing history is untouched. The Banglish prompt also explicitly requires transliterating isolated words and checking all generated text fields. This is rejection, not automatic repair: a model that ignores the instruction may still yield a visible validation error.

Enforcement verification: TypeScript and production build PASS; 170 automated tests and eight desktop/mobile browser cases PASS. Exactly one live Banglish request was made with synthetic metrics and retries disabled: HTTP 200, validated structured response, three recommendations, zero Bengali-block characters in the message or any recommendation text. No existing database records were modified.

Current primary model is `gemini-3.5-flash-lite`, selected centrally in `lib/gemini-client.ts` and through the optional `GEMINI_MODEL` environment override. The earlier failures documented below occurred with Gemini 3.8 Flash; the user subsequently confirmed its daily free-tier quota was exhausted. Migration preserves all language, schema, persistence, diagnostic and retry safeguards. Language verification now disables SDK retries and requires nonempty validated recommendations, stopping at the first failure. Production retries are unchanged. Model compatibility: [official model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [structured output schema documentation](https://ai.google.dev/gemini-api/docs/structured-output). The existing v1beta generateContent request uses supported text/system-instruction/JSON output, object/array/string/enum/required/additionalProperties/maxItems schema features and 2,500 output tokens, below the documented 65,536 limit. No explicit thinking configuration is used.

Migration verification: exactly three live requests, one per language, no retries, no database writes. All returned HTTP 200 with validated structured responses and three recommendations. English and Bengali script checks passed. Banglish returned Bengali script and failed its language check. The Banglish-only system instruction was clarified to require Latin-script transliterated Bangla in both message and recommendationText. English/Bangla instructions are unchanged. No fourth request was made; the clarification needs manual live retesting. The migration's automated suite has 154 passing tests and eight passing browser cases; startup, 39 HTTP smoke checks, source/secrets audit and isolated PostgreSQL Unicode verification passed.

After the clarification, TypeScript/tests/build passed again. The final browser rerun encountered Windows `ERR_NETWORK_IO_SUSPENDED` on one mobile reload and the invalid-Bearer service check returned 500. The affected browser case and startup check both passed when rerun without changing application code or weakening assertions. No additional Gemini requests were made.

## Confirmed findings

The UI sends `en`, `bn`, or `banglish`. The API uses the same enum and the profile fallback maps `bn-BD` to `bn`. All three paths share context preparation, JSON.stringify, the official Gemini SDK/client/model, responseJsonSchema, JSON.parse, Zod validation, and the Serializable persistence transaction. Only the system prompt's language instruction differs. Messages/recommendations have no ASCII-only validation and are stored in PostgreSQL text fields.

Live synthetic reproduction on 2026-10-02:

- English: HTTP 503, then HTTP 504; no valid coaching response.
- Bangla after cooldown: HTTP 504, then HTTP 429; no valid coaching response.
- Banglish: further live calls stopped after the rate limit. Not live verified this run.

These confirm upstream availability/timeout/rate-limit failures before application response parsing or database persistence. They do not establish the cause of every original browser failure: the previous logs did not retain upstream status. No Unicode rejection or language-specific schema defect was reproduced. English's previously successful behavior is preserved and passes regression tests, but a fresh live success cannot be claimed during this service failure.

No model, API version, key, output schema, output-token budget, financial calculations, or retry/deadline configuration was changed. The provider uses the existing two-attempt maximum, 30-second attempt timeout and 45-second total deadline. HTTP 429 is not retried. Do not repeatedly run diagnostics while rate-limited.

## Minimal changes

Safe diagnostics record fixed stage/category, numeric HTTP status, allowed language, elapsed milliseconds and a network-failure boolean. They never print raw errors, bodies, credentials, user IDs, prompts, financial metrics or model responses. HTTP failures, local timeouts, transport/SDK failures, malformed provider JSON, missing text, generated JSON parse failure, structured schema failure, recommendation schema failure, and persistence stages are distinguished. A status observed by transport is retained if an SDK exception loses its HTTP status. Upstream 500/502/503 now have a clear service-unavailable UI message.

The optional `requestId` UUID protects retrying clients. The updated UI supplies it and retains it across uncertain failures and same-tab reloads using sessionStorage containing only a SHA-256 payload fingerprint and retry ID, never message text or finances. A changed message, language, goal or conversation receives a new key. Successful sends clear it.

Server IDs derive from authenticated user, conversation and retry key. The assistant ID also binds the exact validated request payload. A committed retry returns stored messages and recommendations without another Gemini call or write; reusing a key with a changed payload returns 400. Concurrent duplicate commits are prevented by the existing optimistic conversation guard, Serializable transaction, and unique message/recommendation primary keys. A losing transaction checks for the committed winner using a fresh snapshot. Simultaneous in-flight requests can still both call Gemini; no duplicate persisted turn results.

Messages, recommendations and conversation timestamp remain one atomic transaction. A recommendation write failure rolls back the new turn and leaves existing conversation history intact. No success is returned for a partial turn. An uncommitted generated response may need regeneration after a database failure; it is not cached outside the database. This preserves the existing consistency contract. Legacy API callers that omit requestId retain their old behavior and cannot receive duplicate-retry guarantees. Records created before this change have no retry association.

## Verification and commands

Automated coverage includes all three languages through the actual SDK with intercepted transport, correct prompts, Bengali JSON/text preservation, schema failures, malformed output, 429, upstream 5xx recovery/classification, timeout, recommendation failure/rollback, committed retry, changed-key payload, and concurrent retry. Live PostgreSQL text persistence was checked in an isolated temporary table dropped on commit; no application records were touched.

Final results: TypeScript PASS; 151 unit/API/SDK tests passed across 13 files, zero failures; production build PASS; eight desktop/mobile browser tests passed, including retry UUID preservation across an uncertain network failure and reload; temporary production startup and 39 HTTP smoke checks PASS; source/import/secrets audit PASS. Live provider failures remain as documented above; these are not counted as passing language verification.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
npm.cmd run verify:coach-unicode
# Run only after provider availability/rate limits have recovered:
npm.cmd run verify:coach-languages
# Or isolate a language; diagnostics stop at the first failure:
npm.cmd run verify:coach-languages -- bn
```

Manual retest: start the app, send one English message with the existing goal and verify persistence; repeat with Bengali script and then Banglish, checking natural output and recommendation text. For an uncertain send, reload messages before retrying the identical payload; confirm only one USER/ASSISTANT pair and one recommendation set exists. If service errors recur, inspect only the sanitized diagnostic stage/status, wait before retrying, and do not rotate keys/change models without evidence.
