# Section 20 — Deferred Layer 4 Inventory

## Status

OPEN — mandatory real-environment evidence remains deferred.

This inventory exists so Section 20 cannot accidentally treat completed pre-device automation as production certification. A section remains open here until its current-candidate Layer 4 obligations pass or are explicitly proven not applicable.

| Section | Deferred real-environment obligation | Current state |
| --- | --- | --- |
| 01 Mobile Core | physical Android/device matrix, install/upgrade/recovery and real device behavior | DEFERRED / OPEN |
| 02 Platform Security | real OS/key/permission/security environment validation | DEFERRED / OPEN |
| 03 Identity/Auth/Device Trust | real passkey/session/device/key lifecycle and revocation | DEFERRED / OPEN |
| 04 Privacy/Observation | real permission, sensor, restart and privacy-state behavior | DEFERRED / OPEN |
| 05 Voice Runtime | real STT/TTS/microphone/provider latency, interruption and privacy | DEFERRED / OPEN |
| 06 Smart Companion | real voice/avatar/device presence consistency and failure behavior | DEFERRED / OPEN |
| 07 Cross-Device Presence | real LAN/device pairing, handoff, disconnect and recovery | DEFERRED / OPEN |
| 08 Ambient Device/Media | real devices, media services, transfer/recovery and unsupported behavior | DEFERRED / OPEN |
| 09 Device Finder | real radio/location/ring/flash/wake evidence and confidence behavior | DEFERRED / OPEN |
| 10 Emergency Guardian | real emergency-provider/device/permission behavior without live destructive testing | DEFERRED / OPEN |
| 11 Durable Computer Agent | production-like host/restart/side-effect uncertainty and recovery | DEFERRED / OPEN |
| 12 Tooling/Sandbox | real privileged backends/platform guarantees and sandbox escape review | DEFERRED / OPEN |
| 13 Coding Engine | real model/provider credentials, outages, worker/reviewer isolation and load | DEFERRED / OPEN |
| 14 Control Plane | production-like gateway/broker/storage/network/restart delivery behavior | DEFERRED / OPEN |
| 15 Web/Mobile Surfaces | real browser/mobile reconnect/offline/accessibility/approval UX | DEFERRED / OPEN |
| 16 Memory | real persistent/sync stores, deletion propagation, account deletion and migration | DEFERRED / OPEN |
| 17 Knowledge | real vector/search stores, connectors, refresh/offline, deletion and licensing review | DEFERRED / OPEN |
| 18 Intelligence Router | real online/local providers, STT/TTS/vision, vault, outage/load/cost/privacy | DEFERRED / OPEN |
| 19 Integrations/Automation | real vendors/hubs/devices, credentials, network failure, scheduler and high-risk UX | DEFERRED / OPEN |

## Section 20 Additional Certification Debt

Even after every row above is closed, final production release also requires:

- current-candidate whole-system E2E;
- full threat-model refresh;
- disaster-recovery exercise;
- key-rotation/revocation exercise;
- incident-response exercise;
- upgrade and rollback validation;
- sustained performance/load/reliability evidence;
- privacy/regulatory review;
- independent security/penetration review;
- final release checklist approval.

No stable, production or freeze tag is authorized while this inventory contains a mandatory DEFERRED/OPEN or FAILED item.
