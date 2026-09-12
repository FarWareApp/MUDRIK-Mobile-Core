# MUDRIK Smart Companion Architecture

## Goal

MUDRIK should allow each user to choose an optional intelligent companion that feels consistent, familiar and natural across text, voice and future avatar surfaces.

The companion is a user-configurable interaction layer, not a separate unrestricted authority and not a hard-coded AI model identity.

The companion must remain clearly identifiable as MUDRIK and must not falsely claim to be human.

## User Choice

The companion is optional and fully user controlled.

The user may choose or change:

- companion enabled / disabled;
- display name;
- presentation style;
- voice;
- voice gender or neutral presentation where supported;
- avatar / visual appearance;
- speaking pace;
- response length preference;
- formality;
- humor level;
- warmth;
- directness;
- initiative level;
- notification / presence level;
- preferred languages and dialect behavior;
- whether the companion may use long-term memory;
- which memory categories are allowed;
- which proactive behaviors are allowed.

Changing companion appearance, voice or style must not destroy conversation history, user memory or projects.

## Separation of Responsibilities

The companion profile must stay separate from:

- AI model provider;
- general intelligence router;
- long-term memory storage;
- permission engine;
- Computer Agent;
- smart-home execution;
- user authentication;
- voice STT/TTS provider;
- avatar renderer.

Target architecture:

`User -> Companion Profile -> Interaction Policy -> Intelligence Router -> Tools / Memory / Voice`

The companion shapes presentation and interaction behavior. It does not grant tool permissions.

## Companion Profile

A companion profile should contain only interaction-related configuration such as:

- `companionId`;
- `name`;
- `enabled`;
- `voiceProfileId`;
- `avatarProfileId`;
- `personalityPreset`;
- `warmth`;
- `directness`;
- `humor`;
- `initiative`;
- `verbosity`;
- `speakingRate`;
- `preferredLanguages`;
- `memoryPolicyId`;
- `presencePolicyId`;
- `createdAt`;
- `updatedAt`.

Avoid storing provider-specific model identifiers directly in the companion profile.

## Personality System

Personality should be parameterized rather than implemented as one giant prompt.

Suggested adjustable dimensions:

- calm <-> energetic;
- concise <-> expressive;
- formal <-> casual;
- serious <-> humorous;
- reserved <-> warm;
- reactive <-> proactive;
- analytical <-> conversational.

Presets may include examples such as:

- Professional;
- Calm;
- Friendly;
- Minimal;
- Coach;
- Study Partner;
- Creative Partner.

Presets are only starting points. Fine-grained controls override them.

## Natural Continuity

The companion should preserve conversational continuity across supported surfaces.

Examples:

- start a conversation by text and continue by voice;
- start by voice and later review the same task in chat;
- preserve the same chosen personality and name across devices;
- preserve relevant context when moving from mobile to web;
- remember user-approved preferences without forcing the user to repeat them;
- understand follow-up references such as "كمل من وين وقفنا" when the relevant context is available.

## Cross-Device Presence and Spatial Handoff

The companion should be able to move between trusted devices instead of being permanently attached to one screen.

Supported future surfaces may include:

- phone;
- tablet;
- desktop browser;
- smart display;
- television;
- vehicle display where supported and permitted;
- headphones / earbuds for private audio;
- AR glasses;
- VR / mixed-reality headsets;
- future ambient displays or spatial-computing devices.

The companion has one logical identity and one active conversation state even when its presentation moves between devices.

Target behavior:

`Companion Session -> Presence Resolver -> Best Authorized Surface -> Voice / Avatar / Text Renderer`

### Follow-Me Presence

The user may optionally enable a `Follow Me` mode.

When enabled, MUDRIK may select the most appropriate trusted device based on explicitly permitted presence signals such as:

- current active device;
- phone proximity;
- Bluetooth proximity;
- UWB proximity where supported;
- local Wi-Fi / room association;
- smart-home room presence sensors;
- headset-worn state;
- AR/VR headset active state;
- recent direct interaction;
- explicit room selection;
- user voice location when supported and permitted.

No single signal should automatically be treated as perfect identity proof. Presence confidence should combine available signals and degrade safely when uncertain.

The system should prefer local presence inference where practical and avoid sending unnecessary raw sensor streams to the cloud.

### Example Handoff

1. The user starts speaking to the companion on the phone in the kitchen.
2. The user enters the living room where an authorized display is active.
3. If Follow Me is enabled and presence confidence is sufficient, the companion may continue on that display without restarting the conversation.
4. If the user puts on an authorized AR/VR headset, the visual companion may hand off into the spatial environment while preserving the same session and context.
5. When the headset is removed, the companion may return to the phone, nearby display or audio-only mode depending on policy.

A handoff must preserve:

- conversation/session ID;
- relevant short-term context;
- selected companion profile;
- voice identity;
- avatar identity;
- current task state;
- active media/tool context when allowed;
- privacy mode;
- pending approvals.

The destination device does not receive unrestricted access merely because the companion moved there.

### Presence Arbitration

MUDRIK must avoid multiple devices speaking over each other.

Default rule: one primary interactive surface per companion session.

Secondary surfaces may show passive status if the user allows it, but only the primary surface should normally own microphone turn-taking and spoken output.

The Presence Resolver should rank candidate surfaces using factors such as:

- user proximity;
- device activity;
- screen visibility;
- privacy level;
- audio capability;
- avatar capability;
- latency;
- battery/network state;
- whether the device is shared;
- explicit user preference.

The user must always be able to pin the companion to a specific device or disable automatic handoff.

### Spatial Companion in AR / VR

On compatible AR/VR or mixed-reality devices, the companion may appear as:

- a full avatar;
- a small floating avatar;
- a minimal orb / presence indicator;
- voice only;
- contextual panels without a humanoid avatar.

The user chooses the presentation.

The spatial renderer may use device-supported gaze, gesture, controller or hand-tracking input, but those signals remain scoped to the active interaction and must not implicitly grant broader permissions.

The companion should preserve spatial comfort:

- do not appear too close to the user's face;
- do not constantly follow the user's head movement;
- avoid blocking important real-world or virtual content;
- allow the user to reposition, minimize or hide it instantly;
- respect accessibility and motion-sensitivity preferences.

### Privacy-Aware Handoff

Automatic appearance must be privacy aware.

Examples:

- Do not display private messages on a shared television merely because the user entered the room.
- If other people may be present, prefer a private phone or headset surface for sensitive content.
- Do not speak sensitive information aloud on a shared speaker without permission.
- A shared display may show a neutral presence indicator while private content remains on the user's personal device.
- When identity confidence is low, require user confirmation before exposing private context.

Each device should have a trust classification such as:

- `personal_private`;
- `personal_shared_space`;
- `household_shared`;
- `public_or_untrusted`.

Content presentation policy should use this classification before rendering or speaking information.

### Offline / Network Failure Behavior

A temporary network interruption must not make the companion appear to split into inconsistent identities.

Where supported:

- preserve the active local session state;
- queue non-urgent synchronization;
- fall back to local voice/command capabilities;
- avoid simultaneous ownership by multiple devices after reconnection;
- reconcile session ownership using monotonically increasing handoff/session sequence numbers.

## Voice Companion Behavior

The selected companion voice integrates with the MUDRIK Voice Interaction Architecture.

Required behavior:

- natural pacing and prosody;
- low-latency streaming speech;
- interruption / barge-in;
- natural turn taking;
- multilingual speech;
- dialect and code-switching support where available;
- emotional tone appropriate to the content without theatrical exaggeration;
- consistent voice identity across sessions;
- short acknowledgements for instant commands;
- richer speech for conversational requests.

The user may change the voice independently of the companion personality.

## Avatar / Visual Companion

Future avatar support should be modular.

The user may choose:

- no avatar;
- minimal animated presence;
- stylized avatar;
- realistic human-like avatar where supported and clearly presented as virtual;
- male, female or neutral presentation;
- appearance presets and customization.

The avatar renderer must not be required for core companion functionality.

Voice and chat must continue working when avatar rendering is unavailable or disabled.

## Presence Modes

The user chooses how present the companion should be.

Suggested modes:

### Silent

Respond only when directly invoked.

### Normal

Respond to user requests and provide necessary notifications.

### Helpful

May surface useful suggestions, reminders or status changes when explicitly permitted.

### Active Companion

May proactively initiate limited interactions within user-defined categories and quiet hours.

Proactive behavior must be permissioned, rate-limited and easy to disable.

Automatic cross-device handoff is controlled separately from initiative level. A proactive companion does not automatically gain permission to appear on every device.

## Memory Policy

Companion memory is controlled by a separate memory policy.

Possible user-controlled categories:

- communication preferences;
- language preferences;
- routines;
- projects;
- device aliases;
- smart-home preferences;
- recurring tasks;
- companion style preferences.

Sensitive memory categories require stricter treatment and must never be inferred into unrestricted tool authority.

The user must be able to operate MUDRIK with long-term companion memory disabled.

## Smart-Home and Computer Actions

The companion may conversationally request actions, but execution authority stays with the relevant policy layer.

Example:

User: `شغّل ضو المطبخ.`

Companion resolves the natural request and sends a structured tool intent.

The smart-home permission layer decides whether execution is allowed.

Similarly, for computer work:

User: `كمل بناء المشروع تبعي.`

The companion may help resolve context, but the Computer Agent permission policy remains authoritative.

Companion personality never bypasses permissions.

## Safety / Trust Principles

- The companion must not pretend to be a human being.
- It must not claim feelings, consciousness or real-world experiences it does not have.
- It may use natural conversational language without deceptive identity claims.
- It must not manipulate the user into increasing dependency or engagement.
- Proactive interactions must be user-configurable and bounded.
- Permissions remain separate from personality and relationship style.
- A warm or trusted companion still receives no additional execution authority automatically.
- Presence tracking must be opt-in and independently configurable.
- Automatic handoff must never imply automatic disclosure of private content.
- The user can disable Follow Me, clear trusted surfaces, or pin the companion to one device.

## Multi-Companion Future

The architecture may later support multiple saved companion profiles, for example:

- everyday companion;
- work companion;
- study companion;
- coding companion.

However, the initial product should keep one primary active companion per user to avoid unnecessary complexity.

## Initial Implementation Order

1. Companion profile data model.
2. Enable / disable companion.
3. Name and personality preset selection.
4. Voice profile selection.
5. Personality dimensions.
6. Memory policy binding.
7. Presence mode.
8. Cross-surface synchronization.
9. Trusted-device registry for companion presentation.
10. Presence Resolver and explicit manual handoff.
11. Follow-Me automatic handoff after privacy controls are mature.
12. Avatar selection.
13. AR/VR spatial renderer adapters.
14. Advanced proactive behavior only after permission and notification systems are mature.

## Core Rule

The smart companion is the consistent human-facing personality layer of MUDRIK.

It may understand, speak, remember permitted preferences, move between authorized devices and coordinate intelligent behavior, but all real-world actions and all disclosure of private information remain governed by independent permission, privacy and execution systems.
