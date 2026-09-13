# UI/UX Hardening Change Policy

Implementation changes are made in small independently testable batches.

A batch may change presentation structure while preserving existing behavior. A behavior change requires an explicit acceptance criterion and regression coverage.

If a hardening change causes TypeScript, lint, regression, Expo Doctor or security analysis failure, the batch remains open and is repaired before starting the next visual subsystem.

No UI hardening batch is considered physically verified until deferred Layer 4 device testing is executed.
