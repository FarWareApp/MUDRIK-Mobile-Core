# MUDRIK Voice Interaction Architecture

## Goal

MUDRIK voice must behave like a continuous, low-latency assistant rather than a push-to-talk transcription feature.

Primary targets:

- execute simple spoken commands immediately and reliably;
- understand natural wording without requiring rigid command syntax;
- maintain conversational context across turns;
- support interruption, correction and follow-up speech;
- understand multiple languages, dialects, accents, slang and code-switching;
- produce highly natural speech with human-like pacing, prosody, pauses and turn-taking;
- keep execution permissions separate from speech understanding;
- preserve privacy and local-first behavior where practical.

MUDRIK should sound natural and conversational, but it must remain identifiable as MUDRIK and must not falsely claim to be a human.

## Two-Lane Voice Architecture

Voice traffic must not use one slow pipeline for every request.

### Lane A — Instant Command Lane

Used for clear, low-risk, high-frequency actions such as:

- turn kitchen lights on/off;
- change brightness;
- play/pause media;
- set volume;
- start a timer;
- control an already-paired smart-home device;
- open a known application;
- execute a predefined safe shortcut.

Target path:

`Audio -> VAD -> Streaming STT -> Intent Resolver -> Context/Entity Resolver -> Permission Policy -> Tool -> Immediate Voice Ack`

The general reasoning model should be bypassed when the intent is already clear enough to execute safely.

Example:

`"شغّل الأضواء في المطبخ"`

should resolve approximately to:

- intent: `home.light.set_power`
- room: `kitchen`
- target: `all_lights`
- value: `on`

and execute without requiring the user to name a device ID, integration or application.

### Lane B — Conversational / Reasoning Lane

Used when the request is contextual, ambiguous, multi-step or requires reasoning.

Examples:

- "خلّي البيت مناسب للنوم."
- "خفف الضوء هون شوي."
- "مثل مبارح، بس خلي الصالون أغمق."
- "إذا رجعت أمي قبل الساعة عشرة شغّل ضوء المدخل."
- "ليش جهاز التكييف عم يستهلك كهربا أكتر من المعتاد؟"

Target path:

`Audio -> VAD -> Streaming STT -> Context -> Voice/Intent Router -> Reasoning Model -> Tool Plan -> Permission Policy -> Tool Execution -> Natural TTS`

The router may move a request from the instant lane to the reasoning lane whenever confidence is insufficient.

## Context and Entity Resolution

Users should speak naturally rather than memorize device names.

MUDRIK needs a local context graph containing, where permission allows:

- rooms;
- zones;
- devices;
- device groups;
- aliases and nicknames;
- user-defined phrases;
- currently active room/context;
- recent commands;
- paired people/voice profiles;
- routines and scenes;
- current media session;
- current application/task;
- safe location/presence signals when explicitly enabled.

Examples:

- "شغّل الضوء" while a room context is confidently known -> resolve that room.
- "طفيهم" after "شغّل أضواء المطبخ" -> reuse the previous target.
- "أعلى شوي" while music is playing -> increase the active media volume.
- "رجّعه مثل قبل" -> use recent reversible state where supported.

If two interpretations could produce materially different or risky effects, MUDRIK must ask a short clarification instead of guessing.

## Natural Turn Taking

Voice interaction must support:

- full duplex or near-full-duplex conversation where platform support permits;
- barge-in: user speech interrupts MUDRIK immediately;
- fast end-of-turn detection;
- correction while speaking;
- short backchannels only when useful;
- no repeated wake phrase during an active conversation window;
- conversational follow-ups without restating all entities;
- adaptive response length;
- silence handling without prematurely cutting the user off;
- cancellation phrases such as "وقف", "خلاص", "لا تعملها" and their multilingual equivalents.

## Wake and Activation

Architecture must allow several activation modes:

1. wake word;
2. press-to-talk;
3. open voice session;
4. headset/button activation;
5. future context-aware hands-free mode where supported and explicitly enabled.

Wake-word detection should be local where practical.

Owner voiceprint may be used as an additional signal, never as the only authorization factor for high-risk actions.

## Speech Recognition Requirements

STT must be replaceable and independently evaluated.

Required behavior:

- streaming partial hypotheses;
- low-latency finalization;
- Arabic dialects;
- German;
- English;
- multilingual code-switching;
- Arabizi where feasible;
- names and custom vocabulary;
- noisy rooms;
- far-field microphones;
- echo from MUDRIK's own speaker;
- punctuation and semantic segmentation;
- confidence and alternative hypotheses;
- custom vocabulary for rooms/devices/projects/apps.

Audio preprocessing may include:

- acoustic echo cancellation;
- noise suppression;
- automatic gain control;
- microphone selection;
- voice activity detection;
- optional speaker separation when needed.

## Speech Synthesis Requirements

TTS must be independent from the reasoning model and replaceable.

Target quality is highly natural human-like speech, including:

- correct pronunciation;
- natural rhythm;
- realistic pauses;
- sentence-level prosody;
- emotional tone appropriate to context without exaggeration;
- whisper/quiet modes where supported;
- speaking-rate adaptation;
- volume adaptation;
- multilingual voices;
- dialect-aware pronunciation where available;
- correct pronunciation of names, acronyms and mixed-language text;
- streaming synthesis so playback can begin before the full answer is complete;
- instant cancellation when the user interrupts.

MUDRIK should not add filler words merely to imitate a human. Naturalness must come from timing, prosody and context rather than artificial hesitation.

## Latency Strategy

Perceived response latency is a product requirement.

The implementation should optimize the entire path rather than only model speed:

- local VAD/wake word where practical;
- streaming STT;
- partial intent detection before final transcription when safe;
- instant-command routing;
- persistent connections;
- warm local services;
- local device/entity cache;
- parallel context retrieval;
- streaming tool progress;
- streaming TTS;
- speculative preparation that never executes an action before authorization is resolved.

Simple commands should target sub-second perceived response where device/network conditions permit.

## Smart-Home / Device Adapter Boundary

Voice must never contain vendor-specific device logic.

Use an abstraction such as:

`Voice Intent -> Home Capability -> Adapter -> Actual Platform/Device`

Possible adapters may later include standards/platforms such as Matter or other supported smart-home systems.

Example capabilities:

- `home.light.set_power`
- `home.light.set_brightness`
- `home.scene.activate`
- `home.media.play`
- `home.media.pause`
- `home.climate.set_temperature`
- `home.cover.set_position`

This allows providers/devices to change without changing the voice brain.

## Confirmation and Safety Policy

Confirmation must depend on risk, not on whether the request was spoken or typed.

Examples normally eligible for immediate execution when already authorized:

- turning ordinary lights on/off;
- changing brightness;
- changing media volume;
- pausing playback.

Examples that may require confirmation or stronger authorization depending on configuration:

- unlocking an exterior door;
- opening a garage door remotely;
- disabling alarms/security controls;
- purchases;
- sending money;
- deleting important data;
- administrative computer commands;
- exposing stored secrets;
- actions affecting another person's account or privacy.

Voice understanding proposes intent. The permission/policy layer remains authoritative.

## Conversation Memory

Voice and text must share the same conceptual conversation memory.

A user should be able to:

1. start a subject by voice;
2. continue in text;
3. return to voice;
4. keep the relevant context without repeating everything.

Short-lived voice context should preserve pronouns and recent entities such as "هو", "هناك", "رجعها", "مثل قبل" and multilingual equivalents.

Long-term memory must remain governed by the general MUDRIK memory/privacy architecture rather than being hidden inside a voice provider.

## Failure Behavior

MUDRIK must distinguish:

- speech not heard;
- transcription uncertainty;
- ambiguous intent;
- device unavailable;
- permission denied;
- network unavailable;
- action failed;
- action succeeded but confirmation event is delayed.

It should not say an action succeeded until there is adequate execution evidence.

For routine low-risk commands, failure responses should be short and actionable.

## Evaluation Suite

Voice quality must be measured with repeatable evaluation sets covering:

- command intent accuracy;
- entity/room resolution;
- Arabic dialects;
- German;
- English;
- code-switching;
- noisy audio;
- far-field audio;
- wake word false positives/false negatives;
- interruption latency;
- end-of-turn detection;
- STT word/semantic error rate;
- TTS pronunciation;
- TTS naturalness;
- first-audio latency;
- command execution latency;
- conversational context retention;
- ambiguous-command safety;
- unauthorized-command rejection;
- smart-home offline/error recovery.

## Product Principle

The user should not need to learn a command language.

MUDRIK must learn the user's devices, vocabulary, aliases, language and context while maintaining strict execution boundaries.

The desired experience is:

**speak naturally -> MUDRIK understands the intended target -> executes immediately when safe -> responds naturally and briefly.**
