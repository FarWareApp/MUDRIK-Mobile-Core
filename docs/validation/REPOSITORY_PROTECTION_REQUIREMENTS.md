# Repository Protection Requirements

## Purpose

Source control is a security boundary. Strong runtime controls are insufficient if an attacker or mistaken maintainer can silently replace security policy, CI, dependencies, signing configuration or release code.

These requirements define the minimum repository/ruleset posture before a production release branch or production tag is trusted.

## Current State

At the time this requirement was recorded, the active `mudrik-core-v1` branch was not protected by an enforced GitHub branch protection/ruleset. `CODEOWNERS` is present, but CODEOWNERS alone is advisory unless repository rules require review.

This is a known pre-production gap and does not qualify as production-ready source governance.

## Required Production Rules

Before production release:

- require pull requests for protected release branches;
- require review by CODEOWNERS for security-sensitive paths;
- require successful `Mobile Core Validation` or its successor;
- require successful `CodeQL Security Analysis` or its successor;
- require branches to be up to date before merge where practical;
- block branch deletion;
- block force pushes;
- restrict rule bypass to a minimal emergency role;
- preserve an auditable record of emergency bypasses;
- require review for workflow-file changes;
- require review for dependency-manifest/lockfile changes;
- require review for security-policy/capability changes;
- protect release tags from casual rewrite/deletion;
- enable secret scanning and push protection where the repository/account plan supports them;
- enable private vulnerability reporting where supported;
- prefer verified/signed release artifacts and provenance;
- separate production signing credentials from repository contents.

## Required Status Checks

The exact names may evolve, but equivalent gates must remain mandatory:

1. dependency reproducibility;
2. tracked-sensitive-file gate;
3. full-history secret scan;
4. High/Critical dependency vulnerability gate;
5. lint;
6. TypeScript/static correctness;
7. security regression tests;
8. Expo/platform health checks where applicable;
9. Computer Agent tests when affected;
10. CodeQL/SAST;
11. release/build provenance checks for production artifacts.

A status check must not be removable from the required set by an ordinary feature change.

## Security-Critical Paths

Changes in these areas require heightened review:

- `src/core/security/**`;
- `.github/workflows/**`;
- `.github/CODEOWNERS`;
- dependency manifests and lockfiles;
- build/release/signing configuration;
- authentication/device-trust code;
- Computer Agent authorization/sandbox code;
- observation/privacy policy;
- Emergency Guardian policy;
- Control Plane identity/authorization/replay logic;
- secret-management adapters;
- update verification.

## Emergency Change Procedure

An emergency security fix may use an expedited path only when delay would materially increase user risk.

The expedited path still requires:

- exact commit identification;
- automated validation where technically possible;
- no plaintext production secrets in the patch;
- a recorded reason for bypassing normal review;
- post-incident review;
- restoration of normal rules immediately after the emergency.

Emergency access is not a permanent convenience bypass.

## Supply-Chain Rule

Third-party GitHub Actions used in trust-sensitive workflows should be pinned to immutable commit SHAs. Dependency update automation may propose changes, but automated proposals are not automatically trusted or merged.

## Release Rule

No production release should be considered high-assurance if its source branch, release tag, build workflow or signing chain can be rewritten without independent evidence and enforced repository controls.
