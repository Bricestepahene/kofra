# KOFRA LOT 1 — Fondations du protocole cryptographique

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the testable core of the KOFRA V1 zero-knowledge protocol — canonical event encoding, the versioned ciphertext envelope format, the client-side crypto primitives (AEAD, Argon2id KDF, X25519 key wrapping, Ed25519 signing), and the Go-side proof hash-chain/verification logic — with cross-language test vectors proving TypeScript and Go agree byte-for-byte. No HTTP API, no database, no web UI, no browser extension in this lot.

**Architecture:** Two TypeScript packages (`@kofra/protocol` for wire formats, `@kofra/crypto` for client-side crypto operations) and one Go package (`control-plane/internal/proof` for canonical encoding, hash-chaining, and signature verification). A committed fixture file proves the TS and Go implementations produce identical canonical bytes and that Go can verify a TS-produced Ed25519 signature — this is the cross-language interop guarantee the rest of KOFRA depends on.

**Tech Stack:** Go 1.23.4 (stdlib only: `crypto/sha256`, `crypto/ed25519`). TypeScript strict, pnpm workspaces, Vitest, `@noble/curves` (X25519/Ed25519), `hash-wasm` (Argon2id), native `crypto.subtle` (AES-256-GCM, SHA-256).

**Spec:** `docs/superpowers/specs/2026-08-20-kofra-v1-design.md` (§4 Architecture cryptographique et modèle de données), `docs/ADR/0003-client-side-encryption-and-key-hierarchy.md`.

## Global Constraints

- Go version pinned exactly: `go 1.23.4` in every `go.mod` and `go.work`.
- No cryptographic primitive is reimplemented from scratch — only audited libraries (`@noble/curves`, `hash-wasm`) or platform-native `crypto.subtle`.
- No secret, private key, or password ever appears in a test fixture committed to the repo in plaintext form for anything other than intentionally-public RFC test vectors (which are not real secrets).
- Every crypto wrapper function must have at least one test that exercises a tamper/failure path (wrong key, wrong nonce, corrupted ciphertext), not just the happy path.
- X25519/Ed25519 key pairs are always generated randomly — never derived deterministically from a password (ADR 0003).

---

### Task 1: Monorepo scaffolding (Go workspace + pnpm workspace)

**Files:**
- Create: `go.work`
- Create: `control-plane/go.mod`
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`

**Interfaces:**
- Produces: a working `go build ./...` from repo root via `go.work`, and a working `pnpm install` at repo root that resolves `packages/*` as workspace members. Later tasks add packages under `packages/`.

- [ ] **Step 1: Create the Go workspace file**

`go.work`:
```
go 1.23.4

use (
	./control-plane
)
```

- [ ] **Step 2: Create the Go module for the control plane**

`control-plane/go.mod`:
```
module github.com/Bricestepahene/kofra/control-plane

go 1.23.4
```

- [ ] **Step 3: Verify the Go workspace resolves**

Run: `go work sync && go version`
Expected: no errors; prints the installed Go version (must be `>= 1.23.4`; if the local toolchain is older, install Go 1.23.4 before continuing).

- [ ] **Step 4: Create the root package.json**

`package.json`:
```json
{
  "name": "@kofra/root",
  "version": "0.0.1",
  "description": "KOFRA — infrastructure de confiance numérique (monorepo pnpm workspaces + control plane Go)",
  "private": true,
  "license": "UNLICENSED",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 5: Create the pnpm workspace file**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

- [ ] **Step 6: Create the shared base tsconfig**

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 7: Verify pnpm resolves the (still-empty) workspace**

Run: `pnpm install`
Expected: completes with no errors (no packages yet, that's fine).

- [ ] **Step 8: Commit**

```bash
git add go.work control-plane/go.mod package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: scaffold Go workspace and pnpm workspace"
```

---

### Task 2: `@kofra/protocol` — canonical event encoding

**Files:**
- Create: `packages/kofra-protocol/package.json`
- Create: `packages/kofra-protocol/tsconfig.json`
- Create: `packages/kofra-protocol/src/canonical.ts`
- Create: `packages/kofra-protocol/src/canonical.test.ts`
- Create: `packages/kofra-protocol/src/index.ts`

**Interfaces:**
- Produces: `canonicalize(value: JSONValue): Uint8Array` and type `JSONValue` — used by Task 3 (envelope) and Task 8 (Go mirror, same algorithm).
- Deliberately does **not** reuse `JSON.stringify` for string escaping (it doesn't control HTML-escaping or line-separator behavior consistently across languages) — implements its own minimal, fully-specified string escaper so the Go port in Task 8 can match it byte-for-byte.

- [ ] **Step 1: Create the package manifest**

`packages/kofra-protocol/package.json`:
```json
{
  "name": "@kofra/protocol",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create the package tsconfig**

`packages/kofra-protocol/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test for canonical encoding**

`packages/kofra-protocol/src/canonical.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { canonicalize } from "./canonical";

function toText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("canonicalize", () => {
  it("sorts object keys lexicographically", () => {
    expect(toText(canonicalize({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });

  it("is stable regardless of input key order", () => {
    expect(toText(canonicalize({ b: 1, a: 2 }))).toBe(
      toText(canonicalize({ a: 2, b: 1 })),
    );
  });

  it("encodes nested objects and arrays", () => {
    expect(toText(canonicalize({ a: [1, 2, { c: 3, b: 4 }] }))).toBe(
      '{"a":[1,2,{"b":4,"c":3}]}',
    );
  });

  it("encodes primitives", () => {
    expect(toText(canonicalize(null))).toBe("null");
    expect(toText(canonicalize(true))).toBe("true");
    expect(toText(canonicalize(false))).toBe("false");
    expect(toText(canonicalize(-42))).toBe("-42");
  });

  it("escapes quotes and backslashes in strings, without HTML-escaping", () => {
    expect(toText(canonicalize('he said "hi"'))).toBe('"he said \\"hi\\""');
    expect(toText(canonicalize("back\\slash"))).toBe('"back\\\\slash"');
    expect(toText(canonicalize("<script>&"))).toBe('"<script>&"');
  });

  it("escapes control characters as \\u00XX", () => {
    expect(toText(canonicalize("a\tb"))).toBe('"a\\u0009b"');
  });

  it("passes non-ASCII characters through unescaped", () => {
    expect(toText(canonicalize("Bâlé"))).toBe('"Bâlé"');
  });

  it("rejects non-integer numbers", () => {
    expect(() => canonicalize(1.5)).toThrow(/non-integer/);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @kofra/protocol test`
Expected: FAIL — `canonical.ts` does not exist yet.

- [ ] **Step 5: Implement canonical encoding**

`packages/kofra-protocol/src/canonical.ts`:
```ts
export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

/**
 * Deterministic, cross-language-stable encoding used as input to KOFRA's
 * proof event hash chain. Deliberately does not reuse JSON.stringify:
 * this format is fully specified here so the Go port produces identical
 * bytes for identical logical values.
 */
export function canonicalize(value: JSONValue): Uint8Array {
  return new TextEncoder().encode(canonicalizeToString(value));
}

function canonicalizeToString(value: JSONValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error(`canonicalize: non-integer numbers are not supported: ${value}`);
    }
    return String(value);
  }
  if (typeof value === "string") return canonicalizeString(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeToString).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((k) => `${canonicalizeString(k)}:${canonicalizeToString(value[k])}`);
  return `{${entries.join(",")}}`;
}

function canonicalizeString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @kofra/protocol test`
Expected: PASS, all 9 assertions green.

- [ ] **Step 7: Create the package entry point**

`packages/kofra-protocol/src/index.ts`:
```ts
export { canonicalize } from "./canonical";
export type { JSONValue, JSONPrimitive } from "./canonical";
```

- [ ] **Step 8: Commit**

```bash
git add packages/kofra-protocol/package.json packages/kofra-protocol/tsconfig.json packages/kofra-protocol/src/canonical.ts packages/kofra-protocol/src/canonical.test.ts packages/kofra-protocol/src/index.ts pnpm-lock.yaml
git commit -m "feat(protocol): add canonical event encoding"
```

---

### Task 3: `@kofra/protocol` — versioned ciphertext envelope

**Files:**
- Create: `packages/kofra-protocol/src/envelope.ts`
- Create: `packages/kofra-protocol/src/envelope.test.ts`
- Modify: `packages/kofra-protocol/src/index.ts`

**Interfaces:**
- Consumes: nothing from Task 2 directly (independent format).
- Produces: `encodeEnvelope(envelope: Envelope): string`, `decodeEnvelope(encoded: string): Envelope`, and type `Envelope = { version: 1; algorithm: "AES-256-GCM"; nonce: Uint8Array; ciphertext: Uint8Array }` — used by Task 4 (`@kofra/crypto` AEAD wrapper wraps its output in this format) and by ADR 0003's "algorithm_version" columns (future lot).

- [ ] **Step 1: Write the failing test**

`packages/kofra-protocol/src/envelope.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { decodeEnvelope, encodeEnvelope, type Envelope } from "./envelope";

describe("envelope", () => {
  it("round-trips version, algorithm, nonce and ciphertext", () => {
    const envelope: Envelope = {
      version: 1,
      algorithm: "AES-256-GCM",
      nonce: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      ciphertext: new Uint8Array([9, 9, 9, 9]),
    };
    const encoded = encodeEnvelope(envelope);
    const decoded = decodeEnvelope(encoded);
    expect(decoded).toEqual(envelope);
  });

  it("produces a URL-safe string with no padding characters", () => {
    const encoded = encodeEnvelope({
      version: 1,
      algorithm: "AES-256-GCM",
      nonce: new Uint8Array(12).fill(0),
      ciphertext: new Uint8Array(16).fill(255),
    });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("rejects an unknown algorithm on decode", () => {
    const forged = encodeEnvelope({
      version: 1,
      algorithm: "AES-256-GCM",
      nonce: new Uint8Array(12),
      ciphertext: new Uint8Array(4),
    }).replace("AES-256-GCM", "ROT13");
    expect(() => decodeEnvelope(forged)).toThrow(/unknown algorithm/);
  });

  it("rejects an unknown version on decode", () => {
    expect(() => decodeEnvelope('{"version":99,"algorithm":"AES-256-GCM","nonce":"","ciphertext":""}')).toThrow(
      /unsupported envelope version/,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @kofra/protocol test`
Expected: FAIL — `envelope.ts` does not exist yet.

- [ ] **Step 3: Implement the envelope format**

`packages/kofra-protocol/src/envelope.ts`:
```ts
export type EnvelopeAlgorithm = "AES-256-GCM";

export interface Envelope {
  version: 1;
  algorithm: EnvelopeAlgorithm;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

const SUPPORTED_ALGORITHMS: readonly EnvelopeAlgorithm[] = ["AES-256-GCM"];

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeEnvelope(envelope: Envelope): string {
  return JSON.stringify({
    version: envelope.version,
    algorithm: envelope.algorithm,
    nonce: toBase64Url(envelope.nonce),
    ciphertext: toBase64Url(envelope.ciphertext),
  });
}

export function decodeEnvelope(encoded: string): Envelope {
  const raw = JSON.parse(encoded) as {
    version: number;
    algorithm: string;
    nonce: string;
    ciphertext: string;
  };
  if (raw.version !== 1) {
    throw new Error(`decodeEnvelope: unsupported envelope version ${raw.version}`);
  }
  if (!SUPPORTED_ALGORITHMS.includes(raw.algorithm as EnvelopeAlgorithm)) {
    throw new Error(`decodeEnvelope: unknown algorithm ${raw.algorithm}`);
  }
  return {
    version: 1,
    algorithm: raw.algorithm as EnvelopeAlgorithm,
    nonce: fromBase64Url(raw.nonce),
    ciphertext: fromBase64Url(raw.ciphertext),
  };
}
```

Note: `encodeEnvelope`/`decodeEnvelope` use plain `JSON.stringify`/`JSON.parse` (not `canonicalize`) deliberately — this is a storage/transport format, not a value that is hashed or signed, so determinism across languages is not required here, only round-trip correctness. The "no `+/=`" test above is checking the base64url *fields*, not the JSON wrapper.

- [ ] **Step 4: Fix the base64url test to match the actual format**

The JSON wrapper itself contains `"`, `:`, `{` etc., so the "no `+/=`" assertion must check the base64url-encoded fields, not the whole JSON string. Update the test:

```ts
  it("produces base64url-encoded fields with no padding characters", () => {
    const encoded = encodeEnvelope({
      version: 1,
      algorithm: "AES-256-GCM",
      nonce: new Uint8Array(12).fill(0),
      ciphertext: new Uint8Array(16).fill(255),
    });
    const parsed = JSON.parse(encoded) as { nonce: string; ciphertext: string };
    expect(parsed.nonce).not.toMatch(/[+/=]/);
    expect(parsed.ciphertext).not.toMatch(/[+/=]/);
  });
```

Replace the previous "produces a URL-safe string" test with this one in `envelope.test.ts`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @kofra/protocol test`
Expected: PASS, all assertions green.

- [ ] **Step 6: Export from the package index**

Modify `packages/kofra-protocol/src/index.ts`, add:
```ts
export { encodeEnvelope, decodeEnvelope } from "./envelope";
export type { Envelope, EnvelopeAlgorithm } from "./envelope";
```

- [ ] **Step 7: Commit**

```bash
git add packages/kofra-protocol/src/envelope.ts packages/kofra-protocol/src/envelope.test.ts packages/kofra-protocol/src/index.ts
git commit -m "feat(protocol): add versioned ciphertext envelope format"
```

---

### Task 4: `@kofra/crypto` — AEAD wrapper (AES-256-GCM)

**Files:**
- Create: `packages/kofra-crypto/package.json`
- Create: `packages/kofra-crypto/tsconfig.json`
- Create: `packages/kofra-crypto/src/aead.ts`
- Create: `packages/kofra-crypto/src/aead.test.ts`
- Create: `packages/kofra-crypto/src/index.ts`

**Interfaces:**
- Consumes: `Envelope`, `encodeEnvelope`, `decodeEnvelope` from `@kofra/protocol` (Task 3).
- Produces: `generateDataEncryptionKey(): Promise<CryptoKey>`, `encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<string>` (returns an encoded envelope string), `decrypt(key: CryptoKey, encoded: string): Promise<Uint8Array>` — the DEK primitive from spec §4.2/§4.3 (`vault_data_keys`). Used by Task 6 (key wrapping reuses this for wrapping the Vault Key itself).

- [ ] **Step 1: Create the package manifest**

`packages/kofra-crypto/package.json`:
```json
{
  "name": "@kofra/crypto",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@kofra/protocol": "workspace:*",
    "@noble/curves": "^1.6.0",
    "hash-wasm": "^4.11.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create the package tsconfig**

`packages/kofra-crypto/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test**

`packages/kofra-crypto/src/aead.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateDataEncryptionKey } from "./aead";

describe("AEAD (AES-256-GCM)", () => {
  it("round-trips plaintext through encrypt/decrypt", async () => {
    const key = await generateDataEncryptionKey();
    const plaintext = new TextEncoder().encode("le mot de passe du portail DGI");
    const encoded = await encrypt(key, plaintext);
    const decrypted = await decrypt(key, encoded);
    expect(new TextDecoder().decode(decrypted)).toBe("le mot de passe du portail DGI");
  });

  it("produces different ciphertext for the same plaintext (random nonce)", async () => {
    const key = await generateDataEncryptionKey();
    const plaintext = new TextEncoder().encode("same secret");
    const a = await encrypt(key, plaintext);
    const b = await encrypt(key, plaintext);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong key", async () => {
    const key = await generateDataEncryptionKey();
    const otherKey = await generateDataEncryptionKey();
    const encoded = await encrypt(key, new TextEncoder().encode("secret"));
    await expect(decrypt(otherKey, encoded)).rejects.toThrow();
  });

  it("fails to decrypt tampered ciphertext", async () => {
    const key = await generateDataEncryptionKey();
    const encoded = await encrypt(key, new TextEncoder().encode("secret"));
    const parsed = JSON.parse(encoded);
    parsed.ciphertext = parsed.ciphertext.slice(0, -2) + (parsed.ciphertext.at(-2) === "A" ? "B" : "A") + parsed.ciphertext.at(-1);
    await expect(decrypt(key, JSON.stringify(parsed))).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @kofra/crypto test`
Expected: FAIL — `aead.ts` does not exist yet, and `@kofra/protocol` is not yet linked.

- [ ] **Step 5: Implement the AEAD wrapper**

`packages/kofra-crypto/src/aead.ts`:
```ts
import { decodeEnvelope, encodeEnvelope, type Envelope } from "@kofra/protocol";

const NONCE_LENGTH_BYTES = 12;

export async function generateDataEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encrypt(key: CryptoKey, plaintext: Uint8Array): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, plaintext),
  );
  const envelope: Envelope = { version: 1, algorithm: "AES-256-GCM", nonce, ciphertext };
  return encodeEnvelope(envelope);
}

export async function decrypt(key: CryptoKey, encoded: string): Promise<Uint8Array> {
  const envelope = decodeEnvelope(encoded);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: envelope.nonce },
    key,
    envelope.ciphertext,
  );
  return new Uint8Array(plaintext);
}
```

- [ ] **Step 6: Link the workspace dependency and run the test**

Run: `pnpm install && pnpm --filter @kofra/crypto test`
Expected: PASS, all 4 assertions green.

- [ ] **Step 7: Create the package entry point**

`packages/kofra-crypto/src/index.ts`:
```ts
export { generateDataEncryptionKey, encrypt, decrypt } from "./aead";
```

- [ ] **Step 8: Commit**

```bash
git add packages/kofra-crypto/package.json packages/kofra-crypto/tsconfig.json packages/kofra-crypto/src/aead.ts packages/kofra-crypto/src/aead.test.ts packages/kofra-crypto/src/index.ts pnpm-lock.yaml
git commit -m "feat(crypto): add AES-256-GCM AEAD wrapper"
```

---

### Task 5: `@kofra/crypto` — Argon2id key-encryption-key derivation

**Files:**
- Create: `packages/kofra-crypto/src/kdf.ts`
- Create: `packages/kofra-crypto/src/kdf.test.ts`
- Modify: `packages/kofra-crypto/src/index.ts`

**Interfaces:**
- Produces: `type Argon2Params = { memoryKiB: number; iterations: number; parallelism: number }`, `DEFAULT_ARGON2_PARAMS: Argon2Params`, `deriveKeyEncryptionKey(password: string, salt: Uint8Array, params: Argon2Params): Promise<Uint8Array>` (32-byte KEK) — used by Task 6 to encrypt the user's private key bundle (spec §4.2, `encrypted_private_key_bundles`).

- [ ] **Step 1: Write the failing test (properties + a pinned regression value)**

`packages/kofra-crypto/src/kdf.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_ARGON2_PARAMS, deriveKeyEncryptionKey } from "./kdf";

const SALT = new Uint8Array(16).fill(7);

describe("deriveKeyEncryptionKey (Argon2id)", () => {
  it("derives a 32-byte key", async () => {
    const kek = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    expect(kek).toHaveLength(32);
  });

  it("is deterministic for the same password, salt and params", async () => {
    const a = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    const b = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    expect(a).toEqual(b);
  });

  it("produces a different key for a different password", async () => {
    const a = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    const b = await deriveKeyEncryptionKey("different password entirely", SALT, DEFAULT_ARGON2_PARAMS);
    expect(a).not.toEqual(b);
  });

  it("produces a different key for a different salt", async () => {
    const a = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    const otherSalt = new Uint8Array(16).fill(9);
    const b = await deriveKeyEncryptionKey("correct horse battery staple", otherSalt, DEFAULT_ARGON2_PARAMS);
    expect(a).not.toEqual(b);
  });

  // Regression pin — the exact hex value is captured once (Step 4 below) from
  // a known-good run of the underlying audited hash-wasm implementation, then
  // locked here so a future dependency bump or refactor can't silently change
  // the derived key for the same inputs.
  it("matches the pinned regression value for a fixed input", async () => {
    const kek = await deriveKeyEncryptionKey("correct horse battery staple", SALT, DEFAULT_ARGON2_PARAMS);
    const hex = Buffer.from(kek).toString("hex");
    expect(hex).toBe("__PIN_ME__");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @kofra/crypto test`
Expected: FAIL — `kdf.ts` does not exist yet.

- [ ] **Step 3: Implement the Argon2id KDF wrapper**

`packages/kofra-crypto/src/kdf.ts`:
```ts
import { argon2id } from "hash-wasm";

export interface Argon2Params {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

// OWASP-recommended floor for Argon2id (2026): >=19 MiB memory, >=2
// iterations, degree of parallelism 1 for single-threaded browser contexts.
export const DEFAULT_ARGON2_PARAMS: Argon2Params = {
  memoryKiB: 19456,
  iterations: 2,
  parallelism: 1,
};

const KEK_LENGTH_BYTES = 32;

export async function deriveKeyEncryptionKey(
  password: string,
  salt: Uint8Array,
  params: Argon2Params,
): Promise<Uint8Array> {
  const hex = await argon2id({
    password,
    salt,
    memorySize: params.memoryKiB,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: KEK_LENGTH_BYTES,
    outputType: "hex",
  });
  const bytes = new Uint8Array(KEK_LENGTH_BYTES);
  for (let i = 0; i < KEK_LENGTH_BYTES; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
```

- [ ] **Step 4: Run the first four tests, then pin the regression value**

Run: `pnpm --filter @kofra/crypto test -- -t "pinned regression"`
Expected: FAILS with an assertion diff showing the actual computed hex string (e.g. `expected "a1b2..." to be "__PIN_ME__"`). Copy the actual hex value from the failure output and paste it into `kdf.test.ts`, replacing `"__PIN_ME__"`.

- [ ] **Step 5: Run the full suite to verify it passes**

Run: `pnpm --filter @kofra/crypto test`
Expected: PASS, all 5 assertions green.

- [ ] **Step 6: Export from the package index**

Modify `packages/kofra-crypto/src/index.ts`, add:
```ts
export { deriveKeyEncryptionKey, DEFAULT_ARGON2_PARAMS } from "./kdf";
export type { Argon2Params } from "./kdf";
```

- [ ] **Step 7: Commit**

```bash
git add packages/kofra-crypto/src/kdf.ts packages/kofra-crypto/src/kdf.test.ts packages/kofra-crypto/src/index.ts
git commit -m "feat(crypto): add Argon2id key-encryption-key derivation"
```

---

### Task 6: `@kofra/crypto` — X25519 key exchange and key wrapping

**Files:**
- Create: `packages/kofra-crypto/src/x25519.ts`
- Create: `packages/kofra-crypto/src/x25519.test.ts`
- Modify: `packages/kofra-crypto/src/index.ts`

**Interfaces:**
- Consumes: `encrypt`/`decrypt` from `./aead.ts` (Task 4, reused to encrypt the shared-secret-wrapped payload).
- Produces: `generateX25519KeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array }`, `wrapKey(recipientPublicKey: Uint8Array, senderPrivateKey: Uint8Array, payload: Uint8Array): Promise<string>`, `unwrapKey(senderPublicKey: Uint8Array, recipientPrivateKey: Uint8Array, encoded: string): Promise<Uint8Array>` — this is the Vault Key envelope mechanism from spec §4.2/§4.3 (`vault_key_envelopes`).

- [ ] **Step 1: Write the failing test, including the RFC 7748 §6.1 known-answer vector**

`packages/kofra-crypto/src/x25519.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { x25519 } from "@noble/curves/ed25519";
import { generateX25519KeyPair, unwrapKey, wrapKey } from "./x25519";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("X25519", () => {
  // RFC 7748 section 6.1 test vector.
  it("matches the RFC 7748 known-answer shared secret", () => {
    const alicePrivate = hexToBytes("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2".slice(0, 64));
    const bobPublic = hexToBytes("de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4");
    const shared = x25519.getSharedSecret(alicePrivate, bobPublic);
    expect(bytesToHex(shared)).toBe("4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e16174");
  });

  it("generates a public key deterministically derived from a random private key", () => {
    const pair = generateX25519KeyPair();
    expect(pair.privateKey).toHaveLength(32);
    expect(pair.publicKey).toHaveLength(32);
  });

  it("wraps and unwraps a payload between two parties", async () => {
    const recipient = generateX25519KeyPair();
    const sender = generateX25519KeyPair();
    const payload = new TextEncoder().encode("vault key: 32 random bytes go here!!");
    const wrapped = await wrapKey(recipient.publicKey, sender.privateKey, payload);
    const unwrapped = await unwrapKey(sender.publicKey, recipient.privateKey, wrapped);
    expect(new TextDecoder().decode(unwrapped)).toBe("vault key: 32 random bytes go here!!");
  });

  it("fails to unwrap with the wrong recipient private key", async () => {
    const recipient = generateX25519KeyPair();
    const impostor = generateX25519KeyPair();
    const sender = generateX25519KeyPair();
    const wrapped = await wrapKey(recipient.publicKey, sender.privateKey, new TextEncoder().encode("secret"));
    await expect(unwrapKey(sender.publicKey, impostor.privateKey, wrapped)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @kofra/crypto test`
Expected: FAIL — `x25519.ts` does not exist yet.

- [ ] **Step 3: Implement X25519 key generation and ECDH-based key wrapping**

`packages/kofra-crypto/src/x25519.ts`:
```ts
import { x25519 } from "@noble/curves/ed25519";
import { decrypt, encrypt } from "./aead";

export interface X25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export function generateX25519KeyPair(): X25519KeyPair {
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

async function deriveSharedAeadKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", sharedSecret);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Wraps `payload` (e.g. a Vault Key) so only the holder of `recipientPublicKey`'s
 *  matching private key can unwrap it, using an ECDH-derived AES-256-GCM key. */
export async function wrapKey(
  recipientPublicKey: Uint8Array,
  senderPrivateKey: Uint8Array,
  payload: Uint8Array,
): Promise<string> {
  const sharedSecret = x25519.getSharedSecret(senderPrivateKey, recipientPublicKey);
  const aeadKey = await deriveSharedAeadKey(sharedSecret);
  return encrypt(aeadKey, payload);
}

export async function unwrapKey(
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  encoded: string,
): Promise<Uint8Array> {
  const sharedSecret = x25519.getSharedSecret(recipientPrivateKey, senderPublicKey);
  const aeadKey = await deriveSharedAeadKey(sharedSecret);
  return decrypt(aeadKey, encoded);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @kofra/crypto test`
Expected: PASS, all 4 assertions green, including the RFC 7748 known-answer test.

- [ ] **Step 5: Export from the package index**

Modify `packages/kofra-crypto/src/index.ts`, add:
```ts
export { generateX25519KeyPair, wrapKey, unwrapKey } from "./x25519";
export type { X25519KeyPair } from "./x25519";
```

- [ ] **Step 6: Commit**

```bash
git add packages/kofra-crypto/src/x25519.ts packages/kofra-crypto/src/x25519.test.ts packages/kofra-crypto/src/index.ts
git commit -m "feat(crypto): add X25519 key exchange and vault key wrapping"
```

---

### Task 7: `@kofra/crypto` — Ed25519 signing

**Files:**
- Create: `packages/kofra-crypto/src/ed25519.ts`
- Create: `packages/kofra-crypto/src/ed25519.test.ts`
- Modify: `packages/kofra-crypto/src/index.ts`

**Interfaces:**
- Produces: `generateEd25519KeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array }`, `sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array`, `verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean` — used by Task 9's fixture-generation script to produce a client-signed proof event that Go must verify.

- [ ] **Step 1: Write the failing test, including the RFC 8032 TEST 1 known-answer vector**

`packages/kofra-crypto/src/ed25519.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generateEd25519KeyPair, sign, verify } from "./ed25519";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("Ed25519", () => {
  // RFC 8032 section 7.1, TEST 1 (empty message).
  it("matches the RFC 8032 TEST 1 known-answer signature", () => {
    const seed = hexToBytes("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f");
    const expectedPublicKey = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511";
    const expectedSignature =
      "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901" +
      "555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a1" +
      "00";
    const publicKey = generateEd25519KeyPair(seed).publicKey;
    expect(bytesToHex(publicKey)).toBe(expectedPublicKey);
    const signature = sign(seed, new Uint8Array(0));
    expect(bytesToHex(signature)).toBe(expectedSignature);
    expect(verify(publicKey, new Uint8Array(0), signature)).toBe(true);
  });

  it("generates a valid key pair and round-trips sign/verify", () => {
    const pair = generateEd25519KeyPair();
    const message = new TextEncoder().encode("revoke mandate #42");
    const signature = sign(pair.privateKey, message);
    expect(verify(pair.publicKey, message, signature)).toBe(true);
  });

  it("rejects a signature over a different message", () => {
    const pair = generateEd25519KeyPair();
    const signature = sign(pair.privateKey, new TextEncoder().encode("original message"));
    expect(verify(pair.publicKey, new TextEncoder().encode("tampered message"), signature)).toBe(false);
  });

  it("rejects a signature verified against the wrong public key", () => {
    const pair = generateEd25519KeyPair();
    const impostor = generateEd25519KeyPair();
    const message = new TextEncoder().encode("revoke mandate #42");
    const signature = sign(pair.privateKey, message);
    expect(verify(impostor.publicKey, message, signature)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @kofra/crypto test`
Expected: FAIL — `ed25519.ts` does not exist yet.

- [ ] **Step 3: Implement the Ed25519 signing wrapper**

`packages/kofra-crypto/src/ed25519.ts`:
```ts
import { ed25519 } from "@noble/curves/ed25519";

export interface Ed25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** `seed`, if provided, must be 32 random bytes — used only by known-answer
 *  tests. Production code must always call this with no argument so the
 *  private key comes from a CSPRNG (ADR 0003: never derive signing keys
 *  deterministically from a password). */
export function generateEd25519KeyPair(seed?: Uint8Array): Ed25519KeyPair {
  const privateKey = seed ?? ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  return ed25519.sign(message, privateKey);
}

export function verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
  return ed25519.verify(signature, message, publicKey);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @kofra/crypto test`
Expected: PASS, all 4 assertions green, including the RFC 8032 known-answer test.

- [ ] **Step 5: Export from the package index**

Modify `packages/kofra-crypto/src/index.ts`, add:
```ts
export { generateEd25519KeyPair, sign, verify } from "./ed25519";
export type { Ed25519KeyPair } from "./ed25519";
```

- [ ] **Step 6: Commit**

```bash
git add packages/kofra-crypto/src/ed25519.ts packages/kofra-crypto/src/ed25519.test.ts packages/kofra-crypto/src/index.ts
git commit -m "feat(crypto): add Ed25519 signing wrapper"
```

---

### Task 8: Go `internal/proof` — canonical event encoding (mirrors Task 2)

**Files:**
- Create: `control-plane/internal/proof/canonical.go`
- Create: `control-plane/internal/proof/canonical_test.go`

**Interfaces:**
- Produces: `func Canonicalize(value any) ([]byte, error)` — must produce byte-identical output to `@kofra/protocol`'s `canonicalize()` (Task 2) for the same logical value. Consumed by Task 9's hash-chain computation.
- `value` accepts the same shape `encoding/json.Unmarshal` produces for arbitrary JSON into `any`: `nil`, `bool`, `float64` (all JSON numbers decode as `float64` in Go — this function rejects non-integer values, matching the TS side's integer-only rule), `string`, `[]any`, `map[string]any`.

- [ ] **Step 1: Write the failing test**

`control-plane/internal/proof/canonical_test.go`:
```go
package proof

import "testing"

func TestCanonicalizeSortsObjectKeys(t *testing.T) {
	got, err := Canonicalize(map[string]any{"b": float64(1), "a": float64(2)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(got) != `{"a":2,"b":1}` {
		t.Fatalf("got %q, want %q", got, `{"a":2,"b":1}`)
	}
}

func TestCanonicalizeNestedObjectsAndArrays(t *testing.T) {
	got, err := Canonicalize(map[string]any{
		"a": []any{float64(1), float64(2), map[string]any{"c": float64(3), "b": float64(4)}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := `{"a":[1,2,{"b":4,"c":3}]}`
	if string(got) != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestCanonicalizePrimitives(t *testing.T) {
	cases := []struct {
		in   any
		want string
	}{
		{nil, "null"},
		{true, "true"},
		{false, "false"},
		{float64(-42), "-42"},
	}
	for _, c := range cases {
		got, err := Canonicalize(c.in)
		if err != nil {
			t.Fatalf("unexpected error for %v: %v", c.in, err)
		}
		if string(got) != c.want {
			t.Fatalf("Canonicalize(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestCanonicalizeStringEscaping(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{`he said "hi"`, `"he said \"hi\""`},
		{`back\slash`, `"back\\slash"`},
		{"<script>&", `"<script>&"`},
		{"a\tb", `"a	b"`},
		{"Bâlé", `"Bâlé"`},
	}
	for _, c := range cases {
		got, err := Canonicalize(c.in)
		if err != nil {
			t.Fatalf("unexpected error for %q: %v", c.in, err)
		}
		if string(got) != c.want {
			t.Fatalf("Canonicalize(%q) = %s, want %s", c.in, got, c.want)
		}
	}
}

func TestCanonicalizeRejectsNonIntegerNumbers(t *testing.T) {
	if _, err := Canonicalize(float64(1.5)); err == nil {
		t.Fatal("expected error for non-integer number, got nil")
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd control-plane && go test ./internal/proof/...`
Expected: FAIL — `canonical.go` does not exist yet (build error).

- [ ] **Step 3: Implement canonical encoding in Go**

`control-plane/internal/proof/canonical.go`:
```go
package proof

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// Canonicalize produces the same deterministic byte encoding as
// @kofra/protocol's canonicalize() in TypeScript, for the same logical
// value. This is the shared wire format for KOFRA's proof event hash
// chain (spec: docs/superpowers/specs/2026-08-20-kofra-v1-design.md §4.5).
// It deliberately does not use encoding/json for string marshaling: Go's
// json package escapes U+2028/U+2029 and optionally HTML-sensitive
// characters in ways JSON.stringify does not, which would break
// cross-language byte parity. The string escaping here is fully
// self-specified instead.
func Canonicalize(value any) ([]byte, error) {
	var b strings.Builder
	if err := canonicalizeInto(&b, value); err != nil {
		return nil, err
	}
	return []byte(b.String()), nil
}

func canonicalizeInto(b *strings.Builder, value any) error {
	switch v := value.(type) {
	case nil:
		b.WriteString("null")
		return nil
	case bool:
		if v {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
		return nil
	case float64:
		if v != float64(int64(v)) {
			return fmt.Errorf("canonicalize: non-integer numbers are not supported: %v", v)
		}
		b.WriteString(strconv.FormatInt(int64(v), 10))
		return nil
	case string:
		canonicalizeString(b, v)
		return nil
	case []any:
		b.WriteByte('[')
		for i, item := range v {
			if i > 0 {
				b.WriteByte(',')
			}
			if err := canonicalizeInto(b, item); err != nil {
				return err
			}
		}
		b.WriteByte(']')
		return nil
	case map[string]any:
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		b.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				b.WriteByte(',')
			}
			canonicalizeString(b, k)
			b.WriteByte(':')
			if err := canonicalizeInto(b, v[k]); err != nil {
				return err
			}
		}
		b.WriteByte('}')
		return nil
	default:
		return fmt.Errorf("canonicalize: unsupported type %T", value)
	}
}

func canonicalizeString(b *strings.Builder, s string) {
	b.WriteByte('"')
	for _, r := range s {
		switch {
		case r == '"':
			b.WriteString(`\"`)
		case r == '\\':
			b.WriteString(`\\`)
		case r < 0x20:
			fmt.Fprintf(b, `\u%04x`, r)
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd control-plane && go test ./internal/proof/...`
Expected: PASS, `ok github.com/Bricestepahene/kofra/control-plane/internal/proof`.

- [ ] **Step 5: Commit**

```bash
git add control-plane/internal/proof/canonical.go control-plane/internal/proof/canonical_test.go
git commit -m "feat(proof): add canonical event encoding (Go mirror of @kofra/protocol)"
```

---

### Task 9: Go `internal/proof` — hash chain, Ed25519 verification, and cross-language fixture

**Files:**
- Create: `control-plane/internal/proof/hashchain.go`
- Create: `control-plane/internal/proof/hashchain_test.go`
- Create: `packages/kofra-protocol/scripts/generate-proof-fixture.ts`
- Modify: `packages/kofra-protocol/package.json` (add `generate-fixture` script and `tsx` dev dependency)
- Create: `testvectors/proof-event-fixture.json` (generated in Step 4, then committed)

**Interfaces:**
- Consumes: `Canonicalize` from `canonical.go` (Task 8); `Ed25519` verification from Go stdlib `crypto/ed25519`; `@kofra/crypto`'s `generateEd25519KeyPair`/`sign` and `@kofra/protocol`'s `canonicalize` (Tasks 2, 7) from the fixture-generation script.
- Produces: `type ProofEvent struct { OrganizationID string; SequenceNumber uint64; PreviousEventHash [32]byte; Payload map[string]any }`, `func ComputeEventHash(event ProofEvent) ([32]byte, error)`, `func VerifyEventSignature(publicKey ed25519.PublicKey, eventHash [32]byte, signature []byte) bool`, and `var GenesisHash [32]byte` (all zero bytes, the `previous_event_hash` for an organization's first event).

This task is the cross-language interop proof: a TypeScript script generates a signed event fixture, commits it, and the Go test verifies both the hash computation and the signature against that committed fixture — proving the two implementations agree byte-for-byte, which is the whole point of LOT 1.

- [ ] **Step 1: Write the failing Go test against a fixture that does not exist yet**

`control-plane/internal/proof/hashchain_test.go`:
```go
package proof

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type proofEventFixture struct {
	OrganizationID    string         `json:"organizationId"`
	SequenceNumber    uint64         `json:"sequenceNumber"`
	PreviousEventHash string         `json:"previousEventHashHex"`
	Payload           map[string]any `json:"payload"`
	PublicKey         string         `json:"publicKeyHex"`
	ExpectedEventHash string         `json:"eventHashHex"`
	Signature         string         `json:"signatureHex"`
}

func loadFixture(t *testing.T) proofEventFixture {
	t.Helper()
	path := filepath.Join("..", "..", "..", "testvectors", "proof-event-fixture.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("could not read fixture at %s (run: pnpm --filter @kofra/protocol generate-fixture): %v", path, err)
	}
	var fixture proofEventFixture
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatalf("could not parse fixture: %v", err)
	}
	return fixture
}

func TestComputeEventHashMatchesTypeScriptFixture(t *testing.T) {
	fixture := loadFixture(t)

	prevHashBytes, err := hex.DecodeString(fixture.PreviousEventHash)
	if err != nil || len(prevHashBytes) != 32 {
		t.Fatalf("invalid previousEventHashHex in fixture: %v", err)
	}
	var prevHash [32]byte
	copy(prevHash[:], prevHashBytes)

	event := ProofEvent{
		OrganizationID:    fixture.OrganizationID,
		SequenceNumber:    fixture.SequenceNumber,
		PreviousEventHash: prevHash,
		Payload:           fixture.Payload,
	}

	got, err := ComputeEventHash(event)
	if err != nil {
		t.Fatalf("ComputeEventHash failed: %v", err)
	}

	want, err := hex.DecodeString(fixture.ExpectedEventHash)
	if err != nil {
		t.Fatalf("invalid eventHashHex in fixture: %v", err)
	}
	if hex.EncodeToString(got[:]) != hex.EncodeToString(want) {
		t.Fatalf("event hash mismatch: Go computed %x, TypeScript fixture says %x", got, want)
	}
}

func TestVerifyEventSignatureAgainstTypeScriptFixture(t *testing.T) {
	fixture := loadFixture(t)

	prevHashBytes, _ := hex.DecodeString(fixture.PreviousEventHash)
	var prevHash [32]byte
	copy(prevHash[:], prevHashBytes)

	event := ProofEvent{
		OrganizationID:    fixture.OrganizationID,
		SequenceNumber:    fixture.SequenceNumber,
		PreviousEventHash: prevHash,
		Payload:           fixture.Payload,
	}
	eventHash, err := ComputeEventHash(event)
	if err != nil {
		t.Fatalf("ComputeEventHash failed: %v", err)
	}

	publicKey, err := hex.DecodeString(fixture.PublicKey)
	if err != nil {
		t.Fatalf("invalid publicKeyHex in fixture: %v", err)
	}
	signature, err := hex.DecodeString(fixture.Signature)
	if err != nil {
		t.Fatalf("invalid signatureHex in fixture: %v", err)
	}

	if !VerifyEventSignature(ed25519.PublicKey(publicKey), eventHash, signature) {
		t.Fatal("Go could not verify the Ed25519 signature produced by @kofra/crypto")
	}
}

func TestVerifyEventSignatureRejectsTamperedHash(t *testing.T) {
	fixture := loadFixture(t)
	publicKey, _ := hex.DecodeString(fixture.PublicKey)
	signature, _ := hex.DecodeString(fixture.Signature)

	var tamperedHash [32]byte
	copy(tamperedHash[:], []byte("this is not the real event hash"))

	if VerifyEventSignature(ed25519.PublicKey(publicKey), tamperedHash, signature) {
		t.Fatal("expected signature verification to fail against a tampered hash")
	}
}

func TestGenesisHashIsAllZero(t *testing.T) {
	for i, b := range GenesisHash {
		if b != 0 {
			t.Fatalf("GenesisHash[%d] = %d, want 0", i, b)
		}
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd control-plane && go test ./internal/proof/...`
Expected: FAIL — `hashchain.go` does not exist yet, and the fixture file is missing.

- [ ] **Step 3: Implement the hash chain and signature verification in Go**

`control-plane/internal/proof/hashchain.go`:
```go
package proof

import (
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/binary"
)

// GenesisHash is the previous_event_hash used for the first event in an
// organization's proof chain (spec §4.5).
var GenesisHash = [32]byte{}

// ProofEvent is the input to the hash chain. Payload must contain only
// values Canonicalize accepts (nil, bool, integer-valued float64, string,
// []any, map[string]any) — the same constraint @kofra/protocol's
// canonicalize() enforces on the TypeScript side.
type ProofEvent struct {
	OrganizationID    string
	SequenceNumber    uint64
	PreviousEventHash [32]byte
	Payload           map[string]any
}

// ComputeEventHash implements spec §4.5:
//
//	event_hash = SHA-256(canonical_event_payload || previous_event_hash
//	                      || organization_id || sequence_number)
//
// organization_id is hashed as its raw UTF-8 bytes; sequence_number as an
// 8-byte big-endian unsigned integer. Both must be encoded identically by
// any client (e.g. @kofra/protocol) that needs to predict this hash before
// signing it.
func ComputeEventHash(event ProofEvent) ([32]byte, error) {
	canonicalPayload, err := Canonicalize(event.Payload)
	if err != nil {
		return [32]byte{}, err
	}

	h := sha256.New()
	h.Write(canonicalPayload)
	h.Write(event.PreviousEventHash[:])
	h.Write([]byte(event.OrganizationID))

	var seqBytes [8]byte
	binary.BigEndian.PutUint64(seqBytes[:], event.SequenceNumber)
	h.Write(seqBytes[:])

	var sum [32]byte
	copy(sum[:], h.Sum(nil))
	return sum, nil
}

// VerifyEventSignature verifies an Ed25519 signature produced by a client
// (@kofra/crypto's sign()) over an event hash — used when an event
// represents a consentement/approbation (spec §4.5).
func VerifyEventSignature(publicKey ed25519.PublicKey, eventHash [32]byte, signature []byte) bool {
	return ed25519.Verify(publicKey, eventHash[:], signature)
}
```

- [ ] **Step 4: Write the fixture-generation script**

Add to `packages/kofra-protocol/package.json` `scripts`:
```json
    "generate-fixture": "tsx scripts/generate-proof-fixture.ts"
```

Add to `packages/kofra-protocol/package.json` `devDependencies`:
```json
    "tsx": "^4.19.0",
    "@kofra/crypto": "workspace:*"
```

`packages/kofra-protocol/scripts/generate-proof-fixture.ts`:
```ts
import { writeFileSync } from "node:fs";
import { generateEd25519KeyPair, sign } from "@kofra/crypto";
import { canonicalize } from "../src/canonical";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeEventHash(
  organizationId: string,
  sequenceNumber: bigint,
  previousEventHash: Uint8Array,
  payload: Record<string, unknown>,
): Promise<Uint8Array> {
  const canonicalPayload = canonicalize(payload as never);
  const orgIdBytes = new TextEncoder().encode(organizationId);
  const seqBytes = new Uint8Array(8);
  new DataView(seqBytes.buffer).setBigUint64(0, sequenceNumber, false);

  const combined = new Uint8Array(
    canonicalPayload.length + previousEventHash.length + orgIdBytes.length + seqBytes.length,
  );
  let offset = 0;
  combined.set(canonicalPayload, offset);
  offset += canonicalPayload.length;
  combined.set(previousEventHash, offset);
  offset += previousEventHash.length;
  combined.set(orgIdBytes, offset);
  offset += orgIdBytes.length;
  combined.set(seqBytes, offset);

  const digest = await crypto.subtle.digest("SHA-256", combined);
  return new Uint8Array(digest);
}

async function main() {
  const keyPair = generateEd25519KeyPair();
  const organizationId = "org_atlas_cabinet_comptable";
  const sequenceNumber = 1n;
  const previousEventHash = new Uint8Array(32); // genesis: all zero
  const payload = {
    type: "mandate.revoked",
    actorId: "usr_brice",
    targetId: "mandate_9f3a",
    metadata: { level: "logical" },
    occurredAt: "2026-08-20T10:00:00Z",
  };

  const eventHash = await computeEventHash(organizationId, sequenceNumber, previousEventHash, payload);
  const signature = sign(keyPair.privateKey, eventHash);

  const fixture = {
    organizationId,
    sequenceNumber: Number(sequenceNumber),
    previousEventHashHex: bytesToHex(previousEventHash),
    payload,
    publicKeyHex: bytesToHex(keyPair.publicKey),
    eventHashHex: bytesToHex(eventHash),
    signatureHex: bytesToHex(signature),
  };

  writeFileSync(
    new URL("../../../testvectors/proof-event-fixture.json", import.meta.url),
    JSON.stringify(fixture, null, 2) + "\n",
  );
  console.log("Wrote testvectors/proof-event-fixture.json");
}

main();
```

- [ ] **Step 5: Install the new dev dependency and generate the fixture**

Run: `pnpm install && pnpm --filter @kofra/protocol generate-fixture`
Expected: prints `Wrote testvectors/proof-event-fixture.json`, and `testvectors/proof-event-fixture.json` now exists at the repo root with real hex values (not placeholders).

- [ ] **Step 6: Run the Go tests to verify the fixture round-trips**

Run: `cd control-plane && go test ./internal/proof/... -v`
Expected: PASS on all four tests — `TestComputeEventHashMatchesTypeScriptFixture` and `TestVerifyEventSignatureAgainstTypeScriptFixture` are the ones that actually prove cross-language parity; if either fails, the canonical encoding or hash-input framing in `hashchain.go` does not match `generate-proof-fixture.ts` and must be reconciled before continuing — do not proceed past a failing fixture test.

- [ ] **Step 7: Commit**

```bash
git add control-plane/internal/proof/hashchain.go control-plane/internal/proof/hashchain_test.go packages/kofra-protocol/scripts/generate-proof-fixture.ts packages/kofra-protocol/package.json testvectors/proof-event-fixture.json pnpm-lock.yaml
git commit -m "feat(proof): add hash chain, Ed25519 verification, and cross-language fixture"
```

---

### Task 10: Wire the Makefile and run the full suite

**Files:**
- Modify: `Makefile`

**Interfaces:**
- Produces: working `make test` and `make lint` entry points for everything built in Tasks 1-9 (control-plane `internal/proof` package and the three TS packages). `make dev`, `make dev-api`, `make dev-web`, `migrate-*`, `sqlc-generate`, `api-codegen`, `docker-*` remain stubs — nothing in this lot builds an HTTP server, database, web app, or extension, so those targets are untouched.

- [ ] **Step 1: Update the `test` target to cover what exists**

In `Makefile`, replace the `test` target:
```makefile
test:
	cd control-plane && go test ./...
	pnpm -r --filter='./packages/*' test
```

- [ ] **Step 2: Update the `lint` target to cover what exists**

Replace the `lint` target:
```makefile
lint:
	cd control-plane && gofmt -l . && go vet ./...
	pnpm -r --filter='./packages/*' typecheck
```

(`golangci-lint` and `eslint` are deferred to a later lot when there is enough surface area and CI wiring to justify configuring them — `gofmt -l`/`go vet` and `tsc --noEmit` already catch real issues today without adding unconfigured tooling.)

- [ ] **Step 3: Run the full suite from the repo root**

Run: `make test`
Expected: both the Go suite (`internal/proof`, 9 tests total across Tasks 8-9) and the three TypeScript package suites (`@kofra/protocol`: 13 tests, `@kofra/crypto`: 13 tests) pass.

- [ ] **Step 4: Run lint**

Run: `make lint`
Expected: no output from `gofmt -l` (nothing to reformat), `go vet` clean, `tsc --noEmit` clean for all three packages.

- [ ] **Step 5: Commit**

```bash
git add Makefile
git commit -m "chore: wire make test/lint to LOT 1 packages"
```
