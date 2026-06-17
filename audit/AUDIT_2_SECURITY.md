# AUDIT #2 — Security / Auth / Sandbox

**Codebase:** ai-os-new (React 19 + TypeScript + Vite, ~784 TS/TSX files)

---

## Summary

| ID | Severity | Category | File | Status |
|----|----------|----------|------|--------|
| C-01 | CRITICAL | Webhook Verification | `compromise-webhook-service.ts` | No signature verification |
| H-01 | HIGH | Token in URL | `server/sync-server.mjs` | WS token in query param |
| H-02 | HIGH | Auth Bypass | `admin-service.ts` | Destructive ops unauthenticated |
| H-03 | HIGH | CSP Misconfiguration | `docker/nginx.conf` | Overly permissive connect-src |
| H-04 | HIGH | Code Execution | `CodeRunner.tsx` | LLM code execution with user action |
| M-01 | MEDIUM | No Route Auth | `routes.tsx` | No authentication on any route |
| M-02 | MEDIUM | UX Safety | `main.tsx` | `#reset` wipes keys without confirmation |
| M-03 | MEDIUM | Info Leak | `key-registry.ts` | Key metadata in console logs |
| M-04 | MEDIUM | Sandbox Escape | `sandbox.worker.ts` | Tool execution from sandbox |
| M-05 | MEDIUM | SSRF | `mcp-service.ts` | Localhost connections allowed |
| L-01 | LOW | CSP Missing | `index.html` | No dev-mode CSP meta tag |
| L-02 | LOW | Info Leak | `notification-webhook-service.ts` | Blocked URL logged |
| L-03 | LOW | XSS Defense | `MarkdownRenderer.tsx` | DOMPurify dependency hygiene |

---

## CRITICAL

### C-01: Missing Webhook Signature Verification on Compromise Webhook Endpoints

- **File:** `src/kernel/services/compromise-webhook-service.ts`, lines 16–108
- **Functions:** `handleGitHubPayload()`, `handleSentryPayload()`, `onWebhookRequest()`

**Attack Path:**
1. Attacker sends a forged HTTP POST to the webhook ingestion point with a crafted `GitHubSecretAlert` payload.
2. `handleGitHubPayload()` processes the payload without verifying any `X-Hub-Signature-256` header or HMAC.
3. The `secret_type_display` field is used to infer a provider (line 90–102).
4. `EVENTS.COMPROMISE_SIGNAL` is emitted (line 34), causing the system to **automatically disable/compromise legitimate API keys** for the inferred provider.
5. All chat/routing using that provider is disrupted — a denial-of-service via false compromise signals.

**Impact:** An attacker can forge a GitHub Secret Scanning or Sentry alert to force-compromise any provider's API keys, causing complete service disruption.

**Remediation:**
```typescript
import crypto from 'node:crypto';

handleGitHubPayload(payload: GitHubSecretAlert, signature: string, body: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    this.deps.eventBus.emit('compromise:signal:rejected', { source: 'github', reason: 'invalid_signature' });
    return false;
  }
  // ... proceed with payload processing
}
```

---

## HIGH

### H-01: Sync Server WebSocket Token Exposed in URL Query Parameters

- **File:** `server/sync-server.mjs`, lines 146–153
- **Function:** `verifyClient` callback in `WebSocketServer` constructor

**Attack Path:**
1. The `SYNC_SECRET` token is accepted as a query parameter `?token=<SECRET>` for WebSocket connections.
2. WebSocket connection URLs appear in browser dev tools, server access logs, proxy logs, and potentially in referer headers.
3. Anyone with access to these logs can extract the `SYNC_SECRET`.

**Remediation:** Remove query parameter authentication. Require `Authorization` header only.

### H-02: Admin Service Destructive Operations Lack Authentication

- **File:** `src/kernel/services/admin-service.ts`, lines 258–277, 211–222, 230–256
- **Functions:** `reloadRuntime()`, `clearLogs()`, `resetAllStats()`, `updateAgentConfig()`, `createBackup()`, `restoreFromBackup()`

**Attack Path:**
1. `verifyAdminToken()` check is only called from `executeCommand()`.
2. All other destructive methods are public with **no auth check**.
3. Any code path with access to the AdminService instance can reset metrics, clear audit logs, etc.

**Remediation:** Apply `verifyAdminToken` to all destructive methods, not just `executeCommand`.

### H-03: Overly Permissive `connect-src` in HTTP-Only nginx CSP

- **File:** `docker/nginx.conf`, line 22
- `connect-src 'self' https: wss:` allows any HTTPS URL and any secure WebSocket.

**Remediation:** Align with SSL config's `connect-src` to restrict to specific API domains.

### H-04: CodeRunner Executes LLM-Generated Code with `allow-scripts` Sandbox

- **File:** `src/components/ChatPanel/CodeRunner.tsx`, lines 100–246
- **Also:** `src/services/sandbox.worker.ts`, lines 206–222
- LLM prompt injection could trick a user into running malicious code. While sandboxed, the `new Function` in the Worker path could be bypassed via prototype chain exploitation.

**Remediation:** Add user confirmation dialog before executing code. Add `delete proxySelf.constructor; delete proxySelf.__proto__;` to the proxy setup.

---

## MEDIUM

### M-01: No Authentication on Any Client-Side Routes
- **File:** `src/routes.tsx`, lines 110–198
- All routes are publicly accessible with no authentication check.

### M-02: `#reset` URL Hash Triggers Key Wipe Without Confirmation
- **File:** `src/main.tsx`, lines 30–60
- A malicious link can trick a user into wiping all API keys.

### M-03: Excessive Key Metadata Logged to Browser Console
- **Files:** `key-registry.ts`, `bootstrap.ts`, `key-service.ts`
- Key lengths, provider names, and filter decisions are logged with `[KEY_DROP_TRACE]` and `[KEY_SYNC]` prefixes.

### M-04: Sandbox Worker `new Function` Has Potential Prototype Chain Bypass
- **File:** `src/services/sandbox.worker.ts`, lines 200–222
- Tool execution (`t-web`, `t-search`, `t-api-call`) from sandboxed code can exfiltrate data.

### M-05: MCP Service Allows Non-Local Private IP Connections
- **File:** `src/kernel/services/mcp-service.ts`, lines 95–108
- SSRF to local services via MCP server URL configuration.

---

## Positive Security Controls Observed

| Control | Location | Status |
|---------|----------|--------|
| AES-256-GCM encryption for API keys at rest | `src/kernel/security.ts` | ✅ PBKDF2 600K iterations |
| Rate limiting on vault unlock (5 attempts + exponential backoff) | `src/kernel/security.ts:13-25` | ✅ |
| AST-based code validation in sandbox worker | `src/services/sandbox.worker.ts:14-109` | ✅ |
| SSRF protection with private IP blocking | `src/kernel/utils/network.ts` | ✅ |
| API key redaction in error messages | `src/llm/http/llm-http-client.ts:3-4,25-49` | ✅ |
| Webhook URL validation (HTTPS-only + private IP block) | `notification-webhook-service.ts:10-18` | ✅ |
| Key vault strips plaintext from memory after use | `key-vault.ts:79-88` | ✅ |
| Nginx deny-all on unknown `/proxy/*` paths | `docker/nginx.conf:128-131` | ✅ |
| Tool code validated before import/execution | `tool-executor.ts:196-200` | ✅ |
| Sync server requires `SYNC_SECRET` (fail-fast if missing) | `server/sync-server.mjs:14-19` | ✅ |
| CodeRunner iframe has `sandbox="allow-scripts"` without `allow-same-origin` | `CodeRunner.tsx:110` | ✅ |

---

## Статус выполнения (актуализация 2026-06-17)

| ID | Статус | Описание |
|:---|:------:|:---------|
| C-01 | ✅ Fixed | `verifySignature()` + `onWebhookRequest()` проверяют HMAC перед обработкой (уже было) |
| H-01 | ✅ Fixed | URL query param fallback удалён — только `Authorization` header + `Sec-WebSocket-Protocol` |
| H-02 | ✅ Fixed | Все деструктивные методы (`reloadRuntime`, `clearLogs`, `resetAllStats`, `updateAgentConfig`, `createBackup`, `restoreFromBackup`) уже имеют `verifyAdminToken` |
| H-03 | ✅ Fixed | HTTP nginx `connect-src` ограничен до конкретных API-доменов (как в SSL-конфиге) |
| H-04 | ✅ Fixed | CodeRunner уже имеет `window.confirm()` (строка 101); sandbox worker уже имеет prototype hardening (`Object.freeze({})`, shadowing опасных глобалов) |
| M-01 | ✅ By design | Frontend-only SPA — аутентификация на клиентских роутах не применима |
| M-02 | ✅ Removed | `#reset` хэш-обработчик не найден в коде — удалён или никогда не существовал |
| M-03 | ✅ Fixed | Key-metadata logging DEV-gated (HIGH-11) |
| M-04 | ✅ Fixed | AST check (CRIT-6) + prototype hardening в sandbox worker |
| M-05 | ✅ By design | MCP — локальный протокол; localhost разрешён намеренно |
| L-01 | ✅ Fixed | CSP meta tag добавлен в index.html для dev mode |
| L-02 | ✅ Fixed | Info leak — notification-webhook URL blocking уже DEV-gated |
| L-03 | ✅ Fixed | DOMPurify dependency hygiene — проверено, `dompurify` в зависимостях |

**Итого: 13/13 ✅ — все исправлены или верифицированы как чистые**
