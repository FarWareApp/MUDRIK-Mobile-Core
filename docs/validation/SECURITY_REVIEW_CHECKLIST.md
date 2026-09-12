# MUDRIK Security Review Checklist

Use this checklist for security-sensitive changes and Section 5 gates.

## Identity and Authority

- [ ] Every actor has an explicit identity.
- [ ] Every sensitive action maps to a named capability.
- [ ] No wildcard/unbounded capability was introduced without explicit review.
- [ ] Authorization is evaluated outside AI/model output.
- [ ] Revoked and expired grants fail closed.
- [ ] Cross-user and cross-device reuse is rejected.
- [ ] Elevation is explicit and separately constrained.

## Inputs and Boundaries

- [ ] All untrusted input has schema/shape validation.
- [ ] Malformed input has deterministic failure behavior.
- [ ] Path/resource scopes cannot be escaped through traversal or encoding tricks.
- [ ] Domain allowlists resist suffix/lookalike confusion.
- [ ] Replay, duplicate delivery and race behavior is defined where applicable.
- [ ] Untrusted model/tool output is revalidated before effects.

## Secrets and Cryptography

- [ ] No plaintext production secret is committed to source.
- [ ] Secret use relies on scoped references where possible.
- [ ] Private keys are not transmitted unnecessarily.
- [ ] Key rotation and revocation paths exist in the design.
- [ ] Cryptographic algorithms/protocols are platform/library implementations unless specialist review justifies otherwise.
- [ ] Signature/authentication failure fails closed.
- [ ] Signing and verification keys have separate roles where appropriate.

## Storage and Data

- [ ] Sensitive data class is identified.
- [ ] Storage location is justified.
- [ ] Secure-storage namespace contains only approved security classes.
- [ ] Retention/deletion behavior is explicit.
- [ ] Backup/export behavior is understood.
- [ ] Health, credentials, sensor data and ordinary conversations are not implicitly co-authorized.

## Privacy

- [ ] User-visible observation state remains truthful.
- [ ] Privacy lock cannot be overridden by AI/personality/automation.
- [ ] Sensor activation is separately authorized.
- [ ] Logs avoid raw conversations, camera/audio content and unnecessary identifiers.
- [ ] Security telemetry is metadata-focused and redacted.
- [ ] Shared/bystander contexts are considered where relevant.

## Network and Services

- [ ] Production plaintext transport is prohibited.
- [ ] Authentication is not based solely on IP/network location.
- [ ] Request size/rate/resource limits exist where needed.
- [ ] Reconnect/failover cannot broaden permissions.
- [ ] External providers receive only the minimum required data/authority.
- [ ] SSRF/outbound-domain controls are considered for server/agent features.

## Agent and Tooling

- [ ] No unauthenticated raw remote shell is exposed.
- [ ] Filesystem/process/network scopes are bounded.
- [ ] Destructive/admin operations require stronger policy.
- [ ] Cancellation/timeouts/resource limits are defined.
- [ ] Tool output cannot silently become authority.
- [ ] Secret material is not exposed to model context unless narrowly required.

## Supply Chain

- [ ] Lockfile remains frozen/reproducible.
- [ ] Critical/High dependency vulnerabilities are dispositioned.
- [ ] Third-party actions/build tools are pinned where practical.
- [ ] Build artifacts are traceable to source SHA.
- [ ] Production artifact signing/provenance is defined.
- [ ] Compromised dependency/update revocation path exists.

## Telemetry and Incident Readiness

- [ ] Security-relevant state transitions are observable.
- [ ] Sensitive values are redacted.
- [ ] Kill/revoke controls exist for the affected authority.
- [ ] Incident evidence does not require unnecessary private-content retention.
- [ ] Recovery/rotation path is documented.
- [ ] Regulatory notification clocks can be supported where applicable.

## Verification

- [ ] Static checks pass.
- [ ] Unit/component tests cover positive and negative behavior.
- [ ] Adversarial tests cover the relevant boundary.
- [ ] Real-environment/physical tests are complete or explicitly deferred.
- [ ] Critical/High findings are closed or formally dispositioned.
- [ ] Exact candidate SHA and CI evidence are recorded.

## Final Rule

If the reviewer cannot prove why an action is authorized, the action is denied.
