# MUDRIK Project Status

Last consolidated: 2026-09-13

## Authoritative Execution Model

MUDRIK is developed through the twenty-section plan in:

`docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

Every section uses five validation layers:

1. specification/static correctness;
2. unit/component verification;
3. integration/security/adversarial verification;
4. physical/real-environment/E2E/recovery verification;
5. release/independent-review/evidence gate.

The owner elected to defer physical phone/hardware validation until the broader pre-device implementation program is substantially complete. This changes scheduling only; it does **not** waive Layer 4 or authorize production/freeze tags for deferred sections.

## Current Branch and Repository

- Repository: `FarWareApp/MUDRIK-Mobile-Core`
- Branch: `mudrik-core-v1`
- Repository visibility: **public**
- Branch/ruleset enforcement: **not currently protected**
- Production repository-governance requirements: `docs/validation/REPOSITORY_PROTECTION_REQUIREMENTS.md`

`CODEOWNERS` exists for security-sensitive paths, but it remains advisory until GitHub rules enforce review/status checks.

## Current Section State

### Section 01 — Mobile Core Freeze

Status:

`OPEN — PHYSICAL ANDROID LAYER 4 DEFERRED`

The Mobile Core implementation, hardening and automated pre-device gates are strong and operational. It is **not frozen** and must not receive `MOBILE-CORE-FROZEN` until the mandatory physical-device matrix passes.

Permanent Android application ID:

`com.farwareapp.mudrik`

Device-validation assets:

- `eas.json` with `device-validation` internal APK profile;
- `scripts/section01-device-preflight.mjs`;
- `yarn device:preflight`;
- `docs/validation/SECTION_01_ANDROID_DEVICE_RUNBOOK.md`;
- `docs/validation/SECTION_01_DEVICE_EVIDENCE_RECORD.md`;
- manual `.github/workflows/android-device-validation-apk.yml`.

Reference app-owned APK build proven before deferral:

- candidate: `acecb662e6bac231e18a62bccc45197794bda172`;
- Mobile Core Validation run #93 / ID `34708290715`: SUCCESS;
- Android Device Validation APK run #2 / ID `34708290677`: SUCCESS.

The historical APK is reference evidence only. When physical testing starts, rebuild from the then-current exact candidate SHA.

Important closed defect:

`S01-DATA-001` — High / Closed. Project-only attachments could previously be misclassified as orphans and deleted. Ownership cleanup now protects message, draft and project links, with regression coverage.

### Section 02 — Platform Security Foundation

Status:

`PRE-DEVICE COMPLETE — OPEN / LAYER 4 REAL-ENVIRONMENT VALIDATION DEFERRED`

Validated security candidate:

`256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

Evidence:

- Mobile Core Validation run #133 / ID `34714989382`: SUCCESS;
- CodeQL Security Analysis run #26 / ID `34714989334`: SUCCESS;
- regressions at acceptance: **57/57 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: PASS.

Implemented security foundation includes:

- canonical capability registry with no wildcard authority;
- exhaustive capability risk classification;
- deterministic default-deny authorization outside AI/model control;
- runtime validation of untrusted request/grant objects;
- revoked/expired grant rejection;
- non-root workspace scopes for filesystem/git/terminal authority;
- exact-host network allowlists;
- explicit background/elevation scopes;
- traversal/encoding/ambiguous-path rejection;
- secret-reference boundary;
- secure-storage contract;
- privacy-safe security-event schema/redaction;
- CodeQL SAST;
- dependency/secret gates;
- Dependabot;
- CODEOWNERS;
- vulnerability-reporting policy;
- threat-model/review templates;
- APK provenance foundation.

Important closed defect:

`S02-AUTH-001` — High / Closed. An early unscoped capability policy could imply background/elevated authority. Missing scope now fails toward foreground/no-elevation, and high-authority capabilities require explicit narrow scope.

Evidence:

- `docs/validation/SECTION_02_PLATFORM_SECURITY_GATE.md`
- `docs/validation/SECTION_02_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_02_DEFECTS.md`

### Section 03 — Account Identity, Authentication and Device Trust

Status:

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Validated pre-device candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

Evidence:

- Mobile Core Validation run #159 / ID `34766097157`: **SUCCESS**;
- CodeQL Security Analysis run #52 / ID `34766097108`: **SUCCESS**;
- Mobile / Security / Identity regressions: **101/101 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**.

Implemented pre-device identity foundation:

- strict typed account/device/session/device-key/refresh/challenge identifiers;
- passkey-first architecture aligned to current public-key authentication standards;
- explicit authentication-assurance levels rather than a boolean authenticated state;
- deterministic step-up policy;
- high-risk authentication freshness bounds;
- critical operations require recent phishing-resistant authentication and explicit approval boundaries;
- access sessions bound exactly to account/device/device-key and capped to a short lifetime;
- revoked/expired/reauth-required/suspected-reuse session states fail closed;
- device trust binds account/device/key/public-key thumbprint;
- hardware-backed metadata never overrides revoked/suspended/pending state;
- device-key provider exposes signing/public metadata only and no private-key export API;
- refresh-family rotation and generation-reuse detection;
- one-time pairing challenges with exact account/source/target/key/time binding;
- standard versus privileged pairing assurance requirements;
- scoped session/device/global revocation policy;
- one-time purpose/account/session/nonce-bound authentication challenges;
- privacy-safe session inventory with strict field allowlist;
- identity lifecycle security-event types and stronger authenticator/recovery-secret redaction;
- account recovery threat model that forbids recovery becoming a weaker universal bypass.

No unresolved Critical/High Section 03 defect is known in the accepted pre-device scope.

Detailed evidence:

- `docs/architecture/MUDRIK_IDENTITY_AUTH_DEVICE_TRUST.md`
- `docs/architecture/MUDRIK_ACCOUNT_RECOVERY_THREAT_MODEL.md`
- `docs/validation/SECTION_03_IDENTITY_AUTH_DEVICE_TRUST_GATE.md`
- `docs/validation/SECTION_03_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_03_DEFECTS.md`

Layer 4 still mandatory later:

- real passkey/WebAuthn registration/login;
- Android hardware-backed/non-exportable device keys where supported;
- iOS/desktop equivalents when in release scope;
- production-like token/session persistence;
- persistent backend refresh rotation/reuse detection;
- real two-device pairing;
- remote sign-out/revoke with target online and offline;
- key rotation/reinstall/migration behavior;
- recovery implementation and abuse simulations;
- clock-skew/network-failure behavior;
- independent auth/device security review or penetration test.

### Section 04 — Privacy, Permissions and Observation Control

Status:

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Primary objectives:

- implement the observation privacy state machine;
- create a truthful live Sensor-State Registry;
- make `visual_off`, `ambient_off` and `privacy_lock` enforceable below AI/personality;
- make stop/privacy commands immediate and sticky across restart/handoff/context changes;
- require explicit re-enable and real OS permission checks;
- separate camera, microphone, location, presence and health observation boundaries;
- expose privacy-safe indicators/status;
- prove device handoff cannot silently restore observation;
- fail toward a more private state when sensor/control state cannot be verified.

Authoritative architecture:

`docs/architecture/MUDRIK_OBSERVATION_PRIVACY.md`

No production sensor authority will be coupled merely to satisfy pre-device tests.

## Mobile Core Architecture Rule

The app-first boundary remains mandatory:

- Mobile UI is presentation/interaction, not the authority layer;
- chat accepts input and renders output without depending on output source;
- production AI/provider/server transport remains decoupled from Mobile UI until Mobile Core physical freeze obligations are satisfied;
- modules retain one responsibility where practical;
- future server/AI/agent systems must not silently weaken Mobile privacy or permission behavior.

## Computer Agent Direction

Target topology:

`MUDRIK Mobile/Web -> protected Control Plane -> outbound Computer Agent`

The browser/phone sends high-level tasks. The local Computer Agent executes only inside deterministic capability policy. No raw unauthenticated remote shell is exposed.

Future autonomous work loop:

`Understand -> Inspect -> Research -> Plan -> Implement -> Build -> Test -> Diagnose -> Repair -> Re-test -> Review -> Finish`

Completion is based on verification evidence, not code generation alone.

## High-Assurance Control Plane Direction

The future server is a high-assurance, low-latency real-time control plane, not a generic relay. Required properties include:

- protected edge/regional gateways;
- persistent authenticated outbound device channels;
- encrypted transport;
- independently validated sensitive commands;
- nonce/expiry/sequence/replay protection;
- durable task/event delivery;
- idempotency and duplicate-execution defense;
- reconnect/resume;
- rate/resource limits;
- kill/revoke controls;
- compartmentalized identity/authorization/execution boundaries;
- durable source-of-truth state;
- failover/recovery/load/latency acceptance tests.

Relevant architecture:

- `docs/architecture/MUDRIK_HIGH_ASSURANCE_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/validation/SECTION_14_CONTROL_PLANE_ACCEPTANCE_GATE.md`

The Control Plane does not replace the Computer Agent's local permission boundary.

## Privacy and Companion Principles

MUDRIK must truthfully report current observation state. Commands such as "لا تراقبني" / "غمّض عيونك" change the underlying observation state, not only avatar animation. Disabled passive observation must not silently reactivate after restart, handoff, room change or model restart.

Relevant architecture:

- `docs/architecture/MUDRIK_OBSERVATION_PRIVACY.md`
- `docs/architecture/MUDRIK_SMART_COMPANION.md`
- `docs/architecture/MUDRIK_VOICE_INTERACTION.md`
- `docs/architecture/MUDRIK_AMBIENT_DEVICE_MEDIA_ORCHESTRATION.md`
- `docs/architecture/MUDRIK_SMART_DEVICE_FINDING.md`
- `docs/architecture/MUDRIK_EMERGENCY_GUARDIAN.md`

AI/personality/prompt state never grants sensor/tool authority.

## Security Principles

Authoritative baseline:

- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_SECURITY_ASSURANCE_PROGRAM.md`
- `docs/architecture/MUDRIK_THREAT_MODEL_TEMPLATE.md`
- `docs/validation/SECURITY_REVIEW_CHECKLIST.md`

Core rules:

- Zero Trust;
- least privilege;
- deny by default;
- defense in depth;
- fail secure;
- compartmentalize compromise;
- AI/model output is untrusted input, never authority;
- production secrets/private keys are not committed;
- security telemetry is minimized/redacted;
- sensitive actions require deterministic policy;
- security incidents are not hidden merely to protect brand reputation;
- user protection and lawful incident response take priority.

## Dependency / Tooling Posture

Current stack includes Expo SDK 57, React Native, TypeScript, SQLite and Expo Router.

Validation toolchain includes:

- frozen Yarn lockfile;
- ESLint `9.39.5` + `eslint-config-expo 57.0.2` due current Expo/React plugin compatibility constraints;
- TypeScript;
- Expo Doctor `1.20.4` pinned in CI;
- Node 22 in CI;
- CodeQL JS/TS;
- dependency audit;
- full-history secret scan;
- pinned GitHub Actions in trust-sensitive workflows.

Known reviewed Moderate transitive advisories remain visible:

- `uuid@7.0.3` through Expo configuration tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible override is accepted merely to silence an audit warning.

## Physical Validation Debt

Because physical testing is deferred, no section with hardware/OS/production-like obligations may be represented as fully closed until those obligations are executed.

Section 20 cannot close until deferred Layer 4 obligations from Sections 01–19 are completed or explicitly proven not applicable.

When deferred testing begins:

1. rebuild every test artifact/service from exact current candidate SHAs;
2. execute each section's Layer 4 matrix;
3. record PASS/FAIL/BLOCKED evidence;
4. classify every failure;
5. add automated regression coverage where feasible;
6. fix and retest the failure plus adjacent cases;
7. rerun full CI/SAST/security gates;
8. only then authorize freeze/release tags.

## Next Work

1. Verify the documentation-only Section 03 closing HEAD remains green in Mobile Validation and CodeQL.
2. Execute Section 04 — Privacy, Permissions and Observation Control in pre-device mode.
3. Keep Sections 01–03 formally open for their deferred Layer 4 obligations.
4. Do not couple production AI/server/sensor authority into the Mobile UI.

## Development Rule

For every major section:

1. implement the defined scope;
2. run all applicable validation layers;
3. fix failures rather than suppress them;
4. record exact evidence and defects;
5. update this status summary;
6. create stable milestone tags only when all required gates, including deferred physical gates, are satisfied.
