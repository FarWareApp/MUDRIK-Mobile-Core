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
9. Avatar selection.
10. Advanced proactive behavior only after permission and notification systems are mature.

## Core Rule

The smart companion is the consistent human-facing personality layer of MUDRIK.

It may understand, speak, remember permitted preferences and coordinate intelligent behavior, but all real-world actions remain governed by independent permission and execution systems.
