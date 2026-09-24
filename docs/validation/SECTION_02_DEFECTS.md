# Section 02 — Security Defect Record

## S02-AUTH-001 — Unscoped grant could imply background/elevated authority

- Severity: **High**
- Status: **Closed**
- Found during: Layer 3 adversarial review
- Affected area: `src/core/security/capabilityPolicy.ts`
- Root cause: the initial grant evaluator returned `allowed` immediately when a grant omitted `scope`. That bypassed the intended defaults for `allowBackground=false` and `maxElevation=none`.
- Security impact if left unfixed: a capability grant intended only for ordinary foreground, non-elevated use could have been interpreted as permitting background or elevated execution when those request fields were present.
- Production exposure: none; discovered before the policy engine was coupled to production authority.
- Fix commit: `de560e5ef655dfad52eb9c6fe4ef32e5974378f3` (`fail closed for unscoped background and elevation requests`)
- Regression coverage: `test/mobile-core/security-foundation-regression.test.mjs`
- Retest: PASS on candidate `256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

### Fix behavior

Missing scope now means the narrowest defaults:

- foreground only;
- no privilege elevation;
- no implicit expansion of filesystem/network authority.

Later hardening additionally requires explicit non-root workspace prefixes for filesystem/git/terminal capabilities and exact-host domain allowlists for `network.request`.

---

## S02-CI-001 — Synthetic redaction fixture triggered full-history secret gate

- Severity: **Low (validation infrastructure)**
- Status: **Closed**
- Found during: Layer 1 CI validation
- Root cause: adversarial telemetry tests intentionally contained credential-shaped synthetic strings. The full-history secret scanner correctly detected them, but could not distinguish the exact synthetic fixture from a real secret.
- Security impact: no real credential was exposed; the failure was a false positive in test infrastructure.
- Fix commit: `0b4c51a6dc9c948b411f7ae3f81c5b08cd522ae4`
- Fix: permit only the exact known synthetic fixture values, only in the exact regression-test path, then re-scan the remaining line so any additional credential-shaped value still fails.
- Retest: full-history secret scan PASS on candidate `256d55f2b93f33468d3c98d9e3a8192e2c584e1f`.

The scanner does **not** exempt the entire test file or weaken the global credential patterns.

---

## S02-POLICY-001 — Root workspace scope classification ambiguity

- Severity: **Low (policy semantics)**
- Status: **Closed**
- Found during: Layer 2 regression verification
- Root cause: `/` was rejected during path parsing as structurally invalid, producing `grant_invalid`, although the intended policy is that `/` is syntactically valid but forbidden as an overly broad workspace authority.
- Security impact: none; the request was already denied. The defect affected reason-code precision and auditability.
- Fix commit: `256d55f2b93f33468d3c98d9e3a8192e2c584e1f`
- Result: root workspace authority remains denied, now with `grant_scope_required`, clearly distinguishing malformed data from prohibited breadth.
- Retest: 57/57 Mobile/Security regressions PASS.

---

## S02-TIME-001 — Request-controlled time could revive time-bound capability grants

- Severity: **High**
- Status: **Closed**
- Found during: deep Section 01–06 re-audit
- Affected area: `src/core/security/capabilityPolicy.ts`

### Problem

The capability request carried `nowMs`, and the grant evaluator used request-controlled time when deciding whether a grant was expired or revoked. A hostile or stale request could therefore roll its clock backwards and make a time-bound grant appear valid after the trusted runtime time had already passed the expiry/revocation boundary.

### Repair

- time-bound grants now require a separate trusted evaluation time;
- malformed or missing trusted time fails closed for grants that depend on expiry/revocation;
- request `nowMs` is no longer the authority for grant validity;
- the shared trusted-time primitive is available under `src/core/security/trustedEvaluationTime.ts`.

### Regression Evidence

- implementation: `1b5846e5659d313559142b211921eff87f79777f`;
- regression coverage: `de380f7b1e958948137adf69489433023ec16071`;
- `test/mobile-core/security-foundation.test.mjs` proves clock rollback cannot revive an expired/revoked grant.

