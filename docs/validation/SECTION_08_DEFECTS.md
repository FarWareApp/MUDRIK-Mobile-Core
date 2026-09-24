# Section 08 — Defect Record

## Acceptance Summary

At implementation candidate `b40b643a1b7f5856f8d727c471269f1829f0bfc1`, there are **no known unresolved Critical or High Section 08 defects** in the automated/pre-device scope.

The findings below were discovered or exposed during the Section 08 deep audit and were closed before pre-device acceptance.

## S08-INTENT-001 — Raw command-shaped search payloads could pass normalization

- Severity: **Medium**
- Status: **Closed**
- Area: normalized intent sanitization

### Problem

`content.search` correctly rejected URLs, shell metacharacters and explicit bash/PowerShell/cmd wrappers, but still accepted command-shaped strings such as `rm -rf /`, `python -c ...`, `node -e ...`, `sudo ...`, `chmod ...`, `curl ...`, `wget ...` and `ssh ...`.

The normalized intent did not itself grant execution authority, but allowing raw command-shaped payloads violated the Section 08 rule that device/media intents are not a shell or script transport.

### Repair

- centralized orchestration sanitization now recognizes common raw command forms in addition to existing URL/script/credential patterns;
- `content.search` fails closed for those payloads;
- ordinary natural-language search text remains accepted;
- no new execution capability or adapter authority was introduced.

### Regression Evidence

- implementation and regression: `30f414a5949b9b90d5d58858f4d59548dc142690`;
- accepted gate candidate after dependency alignment: `b40b643a1b7f5856f8d727c471269f1829f0bfc1`;
- test: `test/mobile-core/device-media-intent.test.mjs`.

## S08-GATE-001 — Expo SDK 57 patch drift blocked the release gate

- Severity: **Medium**
- Status: **Closed**
- Area: dependency/runtime compatibility

### Problem

The Section 08 implementation regressions, lint and TypeScript checks passed, but Expo Doctor failed because seven SDK 57 packages were one patch behind the versions required by the installed Expo SDK.

This was a validation blocker rather than a Section 08 authorization defect, but pre-device acceptance requires the whole release gate to be green.

### Repair

The following SDK 57-compatible patch versions were aligned without upgrading the SDK family:

- `@expo/ui ~57.0.20`;
- `expo ~57.0.25`;
- `expo-glass-effect ~57.0.4`;
- `expo-image-picker ~57.0.20`;
- `expo-linking ~57.0.11`;
- `expo-notifications ~57.0.21`;
- `expo-router ~57.0.23`.

Expo Doctor then returned **21/21 PASS** and the full Mobile Core Validation workflow passed.

### Regression Evidence

- implementation: `b40b643a1b7f5856f8d727c471269f1829f0bfc1`;
- Mobile Core Validation: run `#673`, ID `36054482695`, **SUCCESS**;
- CodeQL Security Analysis: run `#568`, ID `36054482697`, **SUCCESS**.

## Deferred Findings Are Not Defects Yet

Real phone/TV/computer/display media control, physical network loss/reconnect, platform-specific console/TV restrictions, real shared-screen disclosure behavior, battery/latency/recovery and physical accessibility remain Layer 4 validation debt. Any failure there receives a new defect ID before production closure.
