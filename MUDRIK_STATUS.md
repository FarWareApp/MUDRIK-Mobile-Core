# MUDRIK Project Status

## Current Phase

Two tracks are active and intentionally separated:

1. **Final Mobile Core Device Validation / Freeze Gate**
2. **Computer Autonomy Phase 0 — Web Console + Local Computer Agent foundation**

The code-level Final Mobile Core Hardening pass is complete. The Mobile Core is not frozen yet because physical-device / end-to-end validation is still required.

The Computer Agent foundation is isolated from the Mobile Core runtime and does not change the mobile UI architecture before freeze.

## Current Branch

`mudrik-core-v1`

## Latest Validated Code Baseline

`953a7afba5ee8f6eb5580fa938099bc086f33704` — add local computer agent cli and event protocol

## Repository

GitHub repository:

`FarWareApp/MUDRIK-Mobile-Core`

Repository visibility verified on 2026-09-12: **public**.

## Current Overall Progress

- Mobile Core implementation + code hardening: approximately 97–98%
- Remaining Mobile Core gate: physical-device / end-to-end validation and any defects discovered there
- Computer Autonomy: Phase 0 foundation started
- Full MUDRIK platform: still under active construction

## Accepted Computer Product Direction — 2026-09-12

MUDRIK will **not** use a traditional full desktop application as the primary computer interface.

The target architecture is:

1. **MUDRIK Mobile App** — native mobile control surface.
2. **MUDRIK Web Console** — browser interface for desktop use.
3. **MUDRIK Computer Agent** — small local service installed on the user's computer and responsible for terminal/files/process/browser/system work after permission checks.
4. **MUDRIK Control Plane** — authenticated backend that coordinates users, paired devices, tasks, approvals and events.
5. **MUDRIK Intelligence Router** — produces plans/tool calls but never receives implicit unrestricted computer authority.

The browser itself does not receive direct operating-system control. The local Computer Agent owns local capabilities. This preserves browser sandboxing as a security boundary.

### Computer Autonomy Principle

The Web Console or Mobile App may request work. The paired local agent executes only when the task envelope and permission policy allow it.

Default policy: **deny unless explicitly granted**.

Examples of independently scoped capabilities:

- `terminal.execute`
- `filesystem.read`
- `filesystem.write`
- `filesystem.delete`
- `git.read`
- `git.write`
- `process.start`
- `process.stop`
- `browser.control`
- `screen.capture`
- `network.outbound`
- `secrets.use`
- `system.settings`
- `system.admin`

Permission grants may also restrict filesystem roots, repositories, executables, domains, duration, background execution and elevation.

### Risk Policy

- Low: normal read-only inspection may run automatically inside an active grant.
- Medium: project modification/build/test work may run inside explicit scoped grants.
- High: destructive/external/sensitive actions require task approval unless a narrowly scoped persistent policy explicitly covers them.
- Critical: administrative/security/credential/destructive system actions always require a fresh one-shot approval and OS elevation where applicable.

### Connection Direction

Production Web Console must not expose or depend on an unauthenticated local HTTP/remote-shell port.

Preferred path:

`Web / Mobile <-> MUDRIK Control Plane <-> outbound Computer Agent`

The Computer Agent initiates the outbound authenticated connection. Device private keys remain local.

## Computer Autonomy Phase 0 Completed So Far

- Architecture specification: `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- Web Console product specification: `web-console/README.md`
- Local Computer Agent specification: `computer-agent/README.md`
- Versioned task-envelope JSON schema
- Versioned permission-grant JSON schema
- Versioned agent-event JSON schema
- Capability registry
- Default-deny policy engine
- Filesystem-root scope evaluation
- Executable scope evaluation
- Expiration / revocation checks
- Medium/high/critical risk policy
- Fresh one-shot approval requirement for critical tasks
- Per-step permission re-evaluation to prevent later task steps from escaping the approved workspace
- Linux-first terminal adapter using direct process spawn with `shell: false`
- Limited inherited environment rather than automatically forwarding the full process environment
- Terminal timeout
- Output-size limits
- cancellation support
- Task runner with structured progress events
- Local CLI for executing task envelopes against permission grants
- Automated Phase 0 policy/terminal/task-runner tests
- GitHub Actions now validates Computer Agent Phase 0 in addition to Mobile TypeScript and Expo Doctor

## Next Computer Autonomy Work

### Phase 1 — Secure Device Identity / Pairing

- Local device key pair
- Device ID
- One-time pairing code / QR
- Device registration
- Revocation
- Signed task envelopes
- Replay protection
- task/event sequence numbers

### Phase 2 — Control Plane

- Authenticated user sessions
- paired-device registry
- outbound Agent session channel
- task routing
- approval records
- encrypted transport
- task lifecycle persistence
- audit metadata
- reconnect/replay-safe event delivery

### Phase 3 — Web Console MVP

- Sign-in
- paired computers
- device online/offline state
- workspace/project selector
- task/chat composer
- task plan
- live terminal output
- approval panel
- Stop / Pause / Resume
- final result
- file/git diff view
- permission manager
- activity history

### Phase 4 — Local Tools

- filesystem adapter
- git adapter
- process adapter
- build/test adapters
- browser-control adapter
- screenshot adapter
- secret-reference injection without unnecessary plaintext exposure

### Phase 5 — Autonomous Work Runner

Target workflow example:

1. inspect repository;
2. understand failure;
3. edit files;
4. run tests;
5. inspect failures;
6. revise implementation;
7. commit changes;
8. report result.

The agent may continue autonomously while it remains inside the approved task scope. Crossing a permission/risk boundary pauses the task and requests approval.

### Phase 6 — Mobile Remote Control

- Start computer task from phone
- approve/reject escalation from phone
- progress notifications
- Stop/Pause from phone
- concise result/diff review
- revoke computer/session remotely

### Platform Order

1. Linux first
2. Windows
3. macOS

All platforms must reuse the same versioned task/capability protocol.

## Completed Mobile Core

- Expo SDK 57 application foundation
- Clean mobile-first architecture
- Chat core
- Mock transport abstraction
- Message cancellation / Stop
- Conversation lifecycle
- Persistent conversations
- Persistent messages
- Text-draft persistence with working Save Text Drafts setting
- Conversation history
- Search conversations
- Pin / archive / delete conversations
- Automatic conversation titles
- Attachments schema
- Image attachments
- Video attachments
- Document attachments
- Persistent attachment drafts
- Message attachments
- Project attachments
- Attachment cleanup and maintenance
- Voice recording core
- Voice player foundation
- Microphone permissions
- Projects persistence
- Project management
- Project files
- Project-conversation linking
- Companion persistent profile
- Companion session state machine
- Companion shell
- App settings persistence
- Permissions management
- Theme settings
- Language settings
- Connectivity monitoring
- Wi-Fi / cellular / offline awareness
- Application lifecycle monitoring
- Runtime online/offline mode
- Local notifications
- Notification navigation
- Arabic / German / English localization foundation
- RTL / LTR application direction
- Mixed-text direction resolver
- Accessibility runtime
- Reduced Motion support
- Persistent diagnostics
- Diagnostic privacy sanitization
- Core Health layer
- Core Health / Diagnostics UI
- Safe orphan-attachment maintenance UI
- Error Boundary and recovery
- SQLite migrations through V6
- GitHub Actions validation gate
- secret-file ignore hardening for `.env`, key and signing-file patterns

## Final Mobile Core Hardening Completed — 2026-09-12

The hardening pass completed the following code-level work:

- Final navigation / route hardening
- Notification target and project-route validation
- MessageTransport multimodal input contract
- Attachment metadata passed through the transport boundary without coupling UI to an AI provider
- Attachment-only send support in the mock transport
- Retry preserves original message ID and creation timestamp for idempotency
- Retry preserves attachment payloads
- Local-persistence failures are separated from transport failures
- Missing attachment files are detected during restore
- Missing/corrupted image attachments show an explicit unavailable state instead of silently failing
- Missing draft attachments are detached safely
- Attachment picker/import/remove failures are surfaced with sanitized user-facing errors
- Chat message mixed RTL/LTR direction hardening
- Reduced Motion integrated into stack navigation, message auto-scroll and project editor modal transitions
- Accessibility touch targets and screen-reader labels hardened across chat, conversations and projects
- Conversation/project mutations are guarded against concurrent operations
- Conversation history create/pin/archive/delete failures are caught and surfaced
- Project list create/archive/delete failures are caught and surfaced
- Project detail load/save/picker/import/remove/link failures are caught and surfaced
- Project detail invalid/missing route IDs are handled safely
- Core Health / Diagnostics screen added
- Diagnostics refresh/clear controls added
- Safe manual orphan-attachment cleanup added without deleting linked user data
- Settings reset now requires confirmation and explicitly preserves conversations/projects/files
- Connectivity refreshes again when the app returns to foreground
- Stale connectivity snapshots are ignored
- Connectivity changes are recorded in diagnostics
- GitHub Actions validation added using the repository's Yarn lockfile

## Last Validation

Validated on GitHub Actions against `953a7afba5ee8f6eb5580fa938099bc086f33704`:

- Workflow: `Mobile Core Validation`
- Run: `#9`
- Dependency install using `yarn.lock`: PASS
- TypeScript (`tsc --noEmit`): PASS
- Expo Doctor: PASS
- Computer Agent Phase 0 tests: PASS
- Overall CI result: PASS

## Current Mobile Work

Device / end-to-end validation before freezing Mobile Core.

No production AI model or production server transport should be coupled into the Mobile UI during this gate.

## Remaining Mobile Core Work

### Mandatory Device / E2E Gate

- Launch from a clean install
- Launch after database already contains existing user data
- Restart persistence test
- Background → foreground lifecycle test
- Wi-Fi → cellular transition test
- Cellular → Wi-Fi transition test
- Online → offline → online transition test
- Real mobile-data test outside the home Wi-Fi network
- Permission allow / deny / retry flows
- Camera attachment flow
- Image/video picker attachment flow
- Document attachment flow
- Missing attachment recovery test
- Attachment-only message test
- Text + attachment message test
- Send / Stop / retry test
- Conversation create/open/search/pin/archive/delete test
- Draft restoration / Save Text Drafts off test
- Project create/edit/archive/delete test
- Project file add/remove test
- Project-conversation link/unlink test
- Notification navigation / deep-link test
- Settings persistence test
- Reduced Motion test
- RTL / LTR and mixed Arabic/German/English text test
- Core Health / Diagnostics screen test
- Safe storage cleanup test
- Voice recording / player core test
- Accessibility manual pass on primary screens
- Fix every critical defect discovered during device testing

### Freeze

Only after the device/E2E gate passes:

1. Run TypeScript again.
2. Run Expo Doctor again.
3. Run Computer Agent protocol tests again.
4. Commit any final device-test fixes.
5. Confirm the final GitHub Actions validation is green.
6. Create the `MOBILE-CORE-FROZEN` Git tag for the mobile baseline.
7. Continue Web/Agent/Control Plane work as independently deployable components.

## Mobile Core Completion Gate

1. Final hardening is complete. ✅
2. TypeScript passes. ✅
3. Expo Doctor passes. ✅
4. Full device test passes. ⏳
5. Critical defects found during device testing are fixed. ⏳
6. Mobile Core receives the `MOBILE-CORE-FROZEN` Git tag. ⏳

## AI Architecture After Mobile Core

### Intelligence Router

Central routing layer responsible for selecting the correct model, tools and capabilities.

### General Model

General conversation, reasoning, explanation, education and everyday assistance.

### Coding Model

Independent programming-specialized model.

Responsibilities include:

- Code generation
- Repository understanding
- Debugging
- Architecture
- Testing
- Git
- Linux
- Databases
- Software engineering
- Structured Computer Agent task planning

The coding model proposes work. The Computer Agent permission layer remains independent and authoritative for local execution.

### Vision Model

Independent multimodal image/document understanding model.

### STT

Independent multilingual Speech-to-Text layer.

Requirements include:

- Multiple languages
- Dialects
- Accents
- Noise handling
- Natural speech
- Code-switching

### TTS

Independent multilingual Text-to-Speech layer.

Requirements include:

- Natural human speech
- Appropriate pauses
- Natural rhythm
- Multiple languages
- Dialect support where possible
- Replaceable providers/models

### Memory

Long-term memory architecture separated from individual AI providers.

### Knowledge Engine

Large scalable knowledge library using retrieval instead of forcing all knowledge into model weights.

Possible domains include:

- Medicine
- Psychology
- Philosophy
- Programming
- Computer science
- Engineering
- Mathematics
- Physics
- Chemistry
- Biology
- Economics
- History
- Languages
- Law
- Official documentation
- Academic and open-access research

Every knowledge source should preserve metadata where possible:

- Source
- Author
- License
- Publication date
- Last update
- Domain
- Language
- Reliability / authority
- Version

### RAG

Retrieval-Augmented Generation over the MUDRIK Knowledge Library.

### Embeddings and Reranking

Dedicated models/services for knowledge retrieval and ranking.

### Tools

MUDRIK capabilities should be exposed through independent tools rather than hard-coded into one model.

Local computer tools must be mediated by the Computer Agent policy engine.

### Evaluation

Create a MUDRIK-specific evaluation dataset covering:

- General conversation
- Reasoning
- Tool use
- Memory
- Coding
- Vision
- Files
- Voice
- Offline behavior
- Privacy
- Projects
- Notifications
- Languages
- Dialects
- Code-switching
- Computer task planning
- Permission boundaries
- workspace escape attempts
- cancellation/recovery
- destructive-action approval

### Fine-tuning

Fine-tuning is optional and should only be used when evaluation proves that prompting, tools, memory or RAG are insufficient.

Preferred initial approaches:

- LoRA
- QLoRA
- Specialized behavioral datasets

Do not train a foundation model from scratch unless there is a future technical and financial justification.

## Multilingual Requirement

MUDRIK is intended to be globally multilingual.

Target behavior:

- Automatically detect the user's language
- Understand regional language variations
- Understand dialects
- Understand accents in voice
- Understand slang
- Understand spelling mistakes
- Understand informal writing
- Understand code-switching
- Understand mixed Arabic / German / English conversations
- Understand Arabizi where possible
- Respond naturally in the user's language
- Adapt formality to the user's communication style

The architecture must allow specialized language models or fallback providers when the primary model is weak in a language.

## Conversation Style Requirement

MUDRIK should communicate naturally and professionally.

It should:

- Listen carefully
- Understand before responding
- Be clear
- Be polite
- Be elegant without sounding artificial
- Avoid unnecessary praise
- Avoid flattery
- Avoid excessive agreement
- Avoid repetitive acknowledgements
- Admit uncertainty
- Ask questions only when necessary
- Be concise when concise answers are sufficient
- Be detailed when the task requires detail

Written and spoken responses should represent the same personality while adapting naturally to the medium.

## Core Architecture Principles

- Mobile-first
- Web Console for the primary desktop interface
- Local Computer Agent for operating-system capabilities
- Web browser never receives implicit unrestricted computer authority
- Default-deny local execution policy
- Explicit scoped capabilities
- AI/server layer separated from presentation
- Single responsibility per module where practical
- Models are replaceable
- Coding model independent
- Vision model independent
- STT independent
- TTS independent
- Memory independent from model providers
- Knowledge independent from model weights
- Router decides which intelligence component to use
- Computer Agent decides whether local execution is authorized
- Offline and online operation remain separate runtime capabilities
- Do not couple MUDRIK identity to any single AI model

## Development Rule

At the end of every major phase:

1. Finish implementation.
2. Run validation.
3. Fix failures.
4. Commit the completed phase.
5. Update this file.
6. Push to GitHub.
7. Add a Git tag for major stable milestones.
