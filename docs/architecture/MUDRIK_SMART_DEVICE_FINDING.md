# MUDRIK Smart Device Finding Architecture

## Goal

MUDRIK should help a user locate their own paired devices and accessories using natural language and the best available authorized signals.

The goal is not only to say that a device is nearby. When enough evidence exists, MUDRIK should provide a useful spatial answer such as:

- "Your earbuds are under the chair."
- "Your watch is on the computer desk."
- "Your phone is on the dining table."
- "I last detected it in the bedroom, near the left side of the bed."

MUDRIK must distinguish between a confirmed location, a high-confidence estimate and a weak guess. It must never invent precise placement when the available sensors cannot support it.

## Supported Device Classes

Initial and future device categories may include:

- phones;
- smart watches;
- earbuds / headphones;
- tablets;
- laptops;
- trackers;
- game controllers;
- remotes;
- smart glasses;
- portable smart-home accessories;
- other explicitly paired devices that expose a supported locating signal or integration.

The system only searches devices the user is authorized to locate.

## Natural Language Examples

Users should not need technical commands.

Examples:

- "وين سماعتي؟"
- "دورلي على الساعة."
- "وين حطيت تلفوني؟"
- "لقيت السماعة اليمين بس وين اليسار؟"
- "رنلي الساعة."
- "دلني عليها."
- "هي بالغرفة ولا بالصالة؟"

The intent resolver should map these requests to a structured locating request while preserving the current conversation context.

## Location Signal Fusion

No single radio or sensor should be treated as universally exact.

MUDRIK should combine the strongest available authorized signals, such as:

- UWB ranging / direction where supported by both devices;
- Bluetooth proximity and signal-strength trends;
- local Wi-Fi presence and last-seen association;
- device-provided find / ring capability;
- last known room or zone;
- trusted smart-home presence sensors;
- recent connection / disconnection events;
- charging-state and charger-location context;
- recent media / Bluetooth routing history;
- user-approved local camera observations;
- AR/VR spatial anchors where available;
- explicitly tagged furniture / room map metadata;
- manual user hints from the current search session.

The fusion layer should score freshness, reliability and spatial precision separately.

Target flow:

`User Request -> Device Resolver -> Authorized Signal Collectors -> Location Fusion -> Confidence Model -> Spatial Description / Guidance`

## Confidence Model

Every result should internally carry a confidence class.

Suggested classes:

- `confirmed` — directly supported by a strong current signal or trusted visual/spatial observation;
- `high` — multiple recent signals agree on the same small area;
- `medium` — likely room / zone but exact object placement is uncertain;
- `low` — only stale or weak evidence exists;
- `unknown` — no defensible location can be produced.

User-facing language must match that confidence.

Examples:

High confidence:

`"السماعة تحت كرسي الصالون."`

Medium confidence:

`"غالباً السماعة بالصالة، قريبة من جهة الكنبة."`

Low confidence:

`"آخر مرة شفتها كانت بالصالة من حوالي ساعتين، بس ما بقدر أحدد مكانها الآن."`

MUDRIK must never convert a room-level estimate into a false furniture-level claim.

## Spatial Understanding of the Home

For precise descriptions such as "under the chair" or "on the computer desk", MUDRIK may maintain an optional local spatial map of authorized rooms and objects.

Possible entities include:

- room;
- zone;
- chair;
- sofa;
- bed;
- computer desk;
- dining table;
- television area;
- shelf;
- charging station;
- doorway;
- user-defined object / landmark.

Each entity may have aliases in multiple languages.

Examples:

- `computer desk` -> "طاولة الكمبيوتر" / "المكتب";
- `dining table` -> "طاولة الطعام";
- `living-room chair` -> "كرسي الصالون".

The spatial map must be optional and user controlled.

## Vision-Assisted Finding

When the user explicitly enables compatible local cameras or points a phone / AR device at a room, MUDRIK may use vision to look for a paired device or recognizable accessory.

Examples:

1. User says: `"دورلي على السماعة."`
2. Radio signals indicate the living room.
3. The user points the phone camera around the room, or an authorized local camera has an allowed search mode.
4. Vision identifies the earbuds case partially visible under a chair.
5. MUDRIK responds: `"لقيتها، تحت الكرسي جنب الطاولة."`

Vision search must be explicitly permissioned. Cameras must not be silently activated merely because a device is missing.

Raw camera streams should stay local where practical. Only the minimum derived result required for the task should leave the device when cloud processing is needed and permitted.

## Guided Search Mode

When an exact location is not available, MUDRIK should guide the user interactively.

Possible guidance:

- directional arrow where supported;
- distance estimate where supported;
- "closer / farther" feedback;
- signal-strength trend;
- room-to-room guidance;
- optional vibration / audio cues;
- map overlay;
- AR arrow or marker in a compatible headset / phone camera;
- ring / sound / flash on the missing device when the platform supports it.

Example:

`"امشِ باتجاه الصالون... أقرب... الآن لف يمين... السماعة قريبة جداً من الكرسي."`

The system should avoid pretending centimeter-level precision when the hardware only supports coarse proximity.

## Ring / Haptic / Visual Locate Actions

If a paired device exposes an authorized locate action, MUDRIK may offer or execute actions such as:

- play sound;
- vibrate;
- flash screen / LED;
- display a full-screen locate message;
- wake the device;
- show a direction indicator on another authorized surface.

These actions are separate capabilities and remain governed by permission policy.

## Device Identity Resolution

MUDRIK should understand user aliases and context.

Examples:

- "سماعتي" -> user's primary earbuds;
- "الساعة" -> user's active watch;
- "تلفوني القديم" -> a specific paired phone alias;
- "السماعة اليمين" -> right earbud within a known pair.

If multiple devices match and the distinction matters, MUDRIK asks a short clarification instead of choosing arbitrarily.

## Last-Seen Timeline

For devices that cannot currently be reached, MUDRIK may keep a privacy-controlled event timeline such as:

- last connected time;
- last room / zone;
- last paired host;
- last charger;
- last Bluetooth route;
- last authorized visual observation;
- last explicit user interaction.

Example response:

`"ما عم اقدر أوصل للساعة الآن. آخر مرة كانت متصلة بالموبايل الساعة 14:18، وكان الموبايل وقتها بالمكتب."`

Historical events must have retention controls and must not become unrestricted location tracking.

## Companion Integration

The Smart Companion may present the result naturally, but it does not own tracking authority.

Architecture:

`Companion -> Device Finding Intent -> Permission Layer -> Device Finder -> Result -> Companion Presentation`

Examples:

- spoken answer;
- text card;
- phone vibration guidance;
- AR marker;
- television / smart-display direction cue;
- map or room overlay.

The companion can also move to the most useful authorized surface during the search, for example switching to the phone camera or AR headset when visual guidance is needed.

## Privacy and Security Rules

- Locate only devices the current account / household role is authorized to locate.
- Do not expose another household member's device location without their permission or an explicitly configured household policy.
- Device finding must not become covert person tracking.
- Camera use requires explicit permission and visible state.
- Microphone / camera / room sensors remain governed by independent permissions.
- Do not continuously upload raw sensor data by default.
- Prefer local processing for proximity, spatial maps and vision when practical.
- Allow users to disable individual signal sources.
- Allow users to clear location history and spatial metadata.
- Shared displays must not reveal sensitive location details unless privacy policy permits it.
- Every remote locate / ring action should be attributable in audit history when applicable.

## Offline Behavior

When the network is unavailable, MUDRIK should still use any local capabilities that remain available, such as:

- Bluetooth proximity;
- UWB;
- local Wi-Fi state;
- local spatial map;
- local camera / vision model;
- local device discovery;
- cached last-seen information.

Cloud-only integrations may be unavailable, but the local search should continue when possible.

## Future Spatial Mode

With AR glasses or mixed-reality devices, Device Finder may become a spatial search experience.

Possible future behavior:

1. User says: `"وين سماعتي؟"`
2. MUDRIK detects the earbuds in the living room.
3. The companion appears in the user's AR view.
4. A subtle arrow points toward the room.
5. Near the destination, the UI changes to fine guidance.
6. If vision confirms the case under a chair, a marker appears over the exact visible location.

This mode should remain usable without a human-like avatar; the spatial guidance layer is independent from avatar presentation.

## Failure Handling

MUDRIK must report why a search is limited when useful.

Examples:

- device battery may be empty;
- Bluetooth / UWB unavailable;
- device is offline;
- location permission disabled;
- device has not been paired;
- signal is too weak;
- last observation is stale;
- current platform does not expose a remote locate capability.

It should then propose the best available next action rather than simply returning "not found".

## Initial Implementation Order

1. Device registry and aliases.
2. Find-device intent model.
3. Ring / sound actions for supported paired devices.
4. Bluetooth / local-network proximity collectors.
5. Last-seen state and confidence model.
6. Room / zone association.
7. UWB adapter where hardware supports it.
8. Guided-search UI.
9. Optional spatial home map.
10. Explicit opt-in vision-assisted search.
11. AR / VR spatial guidance.
12. Multi-sensor fusion tuning and evaluation.

## Evaluation Requirements

Test cases should include:

- device in the correct room but weak signal;
- two same-type devices owned by the user;
- stale last-seen data;
- device battery dead;
- only one earbud missing;
- device under furniture;
- camera permission denied;
- UWB unavailable;
- Bluetooth unavailable;
- mixed Arabic / German / English commands;
- incorrect visual candidate;
- multiple furniture objects with similar names;
- privacy boundary between household members;
- offline finding;
- handoff from voice result to AR guidance.

False precise-location claims should be treated as a serious quality failure.

## Core Rule

MUDRIK should tell the user where a missing paired device is only to the precision justified by current authorized evidence. When exact location is unavailable, it should guide the user progressively instead of guessing.