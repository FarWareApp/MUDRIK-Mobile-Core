# MUDRIK Ambient Device & Media Orchestration

## Goal

MUDRIK should understand natural commands that target televisions, phones, computers, game consoles, smart displays and other paired devices without requiring the user to know application names, device IDs or integration details.

Examples:

- "غير المحطة."
- "افتح يوتيوب."
- "شغّل أغاني."
- "افتح يوتيوب وشغّل فيروز."
- "شغّل شيء مناسب للجو."
- "كمّل نفس الفيديو على التلفزيون."
- "انقل الأغنية للهاتف."
- "افتح اللعبة على البلايستيشن."

The user describes intent. MUDRIK resolves the correct device, application, content and action through structured context and capability adapters.

## Core Architecture

`Natural Request -> Intent Resolver -> Active Device / Context Resolver -> App & Media Resolver -> Permission Policy -> Device Adapter -> Application Adapter -> Action`

No AI model should receive raw unrestricted control of a device.

Execution is always mediated by device-specific and application-specific capabilities.

## Cross-Device Control

Supported device classes may include:

- television / smart TV;
- set-top box;
- phone;
- tablet;
- desktop / laptop;
- smart display;
- game console;
- streaming box;
- vehicle infotainment where supported and permitted;
- AR/VR device;
- speakers / headphones;
- future paired devices.

The same intent schema should work across device classes.

Example normalized intents:

- `media.play`
- `media.pause`
- `media.next`
- `media.previous`
- `media.seek`
- `media.set_volume`
- `media.transfer_session`
- `tv.channel.next`
- `tv.channel.set`
- `app.open`
- `app.close`
- `content.search`
- `content.play`
- `game.launch`
- `device.focus`

## Device Resolution

When the user does not name a device, MUDRIK should resolve the most likely target from context.

Signals may include:

- current primary companion surface;
- active room;
- currently playing media session;
- recently addressed device;
- device proximity;
- screen-on / active state;
- explicit user preferences;
- device capability;
- whether a device is shared;
- privacy level.

Example:

If the user is in the living room and the television is the active media surface, "غير المحطة" should target that television without requiring the user to say its name.

If confidence is low and two devices are equally plausible, MUDRIK should ask a short clarification.

## Application Resolution

The user may name an application directly:

`"افتح يوتيوب" -> app.open(provider=YouTube)`

Or the application may be implied by the content request:

`"شغّل الفيديو اللي كنت عم شوفه"`

MUDRIK may resolve the appropriate application from:

- current media session;
- recent activity;
- content availability;
- user-preferred provider;
- subscription / account availability;
- device capability;
- application installation state;
- regional availability.

MUDRIK should not silently install applications or purchase content unless the required permission and confirmation policy explicitly allows it.

## Content Resolution

### Explicit Content

If the user names the content, MUDRIK should search for the requested item and play the best matching result after resolving ambiguity.

Examples:

- "افتح يوتيوب وشغّل أغنية X."
- "شغّل الحلقة الثالثة من المسلسل."
- "افتح سبوتيفاي وشغّل قائمتي المفضلة."

If multiple materially different results match, MUDRIK should ask a concise clarification rather than guessing.

### Implicit Content

If the user requests a category but does not specify an exact item, MUDRIK may select content using a recommendation context.

Example:

`"شغّل أغاني"`

Possible context inputs:

- user listening history;
- explicitly liked / disliked content;
- saved playlists;
- time of day;
- current room;
- current activity if explicitly known;
- current media continuity;
- household quiet hours;
- ambient lighting state;
- weather context when available and relevant;
- recent user choices;
- companion interaction context;
- explicit temporary mode such as focus / relax / workout.

Ambient signals such as lighting may influence a recommendation, but they must not be treated as definitive proof of the user's emotional or mental state.

A safe framing is `ambient_context`, not `inferred_emotion`.

## Ambient Context Engine

MUDRIK may construct a short-lived ambient context object from explicitly permitted signals.

Example fields:

- `roomId`
- `timeOfDay`
- `lightingLevel`
- `lightingScene`
- `activeDisplay`
- `activeAudioDevice`
- `recentMediaCategory`
- `currentRoutine`
- `householdQuietMode`
- `presenceConfidence`
- `manualMoodPreset`

The object should be ephemeral by default and should not become permanent memory unless the user has permitted that category.

## Companion Screen Placement

When the smart companion is visually present on a television, monitor or other display, it should avoid covering important content.

Target architecture:

`Display Frame -> Safe Region Detector -> Reserved UI Zones -> Companion Placement Engine -> Render`

The companion may:

- move to a free corner automatically;
- shrink when content becomes crowded;
- switch to a minimal bubble;
- become audio-only during full-screen playback;
- move when subtitles, menus or important UI appear;
- obey direct commands such as "روح عاليمين", "اطلع لفوق", "صغّر حالك", "اختفي شوي";
- remember a user-preferred placement per device when permitted.

The renderer should avoid:

- subtitles;
- video controls;
- game HUD elements where detectable;
- notifications;
- important application controls;
- faces / focal content where reliable visual layout information is available.

For privacy-sensitive or shared screens, the companion may render only a neutral avatar/status while private text remains on the user's personal device.

## Automatic Movement Rules

The companion may reposition itself without a spoken command when:

- the current position begins covering important content;
- the application changes layout;
- subtitles appear;
- a game enters active play;
- a notification panel opens;
- the display rotates or changes aspect ratio;
- the user changes the selected layout policy.

Automatic movement should be subtle and should not create distracting continuous motion.

Reduced Motion preferences must be respected.

## Media Session Continuity

MUDRIK should model media as a logical session that may move between devices when supported.

Example:

1. Music is playing on the living-room TV.
2. User says "خدها معي عالموبايل."
3. MUDRIK resolves the active media session.
4. It checks whether the provider and phone support transfer/resume.
5. Playback continues on the phone as close as possible to the previous position.
6. The television session is stopped or paused according to policy.

The same principle may apply to:

- videos;
- music;
- podcasts;
- supported games / remote sessions;
- browser sessions;
- documents and presentations.

## Game Console Control

For consoles such as PlayStation or other supported systems, MUDRIK may expose only capabilities supported by the platform integration.

Examples may include:

- launch a known game;
- open a supported media application;
- pause or control media;
- show game status;
- transfer audio to an approved device;
- trigger predefined safe shortcuts.

MUDRIK must not assume unrestricted console control where the platform API does not provide it.

Purchases, account changes and destructive save/data actions require explicit confirmation and appropriate permissions.

## Preference and Recommendation Model

When content is unspecified, MUDRIK should prefer explainable user preference signals over random selection.

Suggested priority:

1. explicit request in the current turn;
2. current media/session context;
3. explicit temporary mode or routine;
4. saved favorites/playlists;
5. recent positive choices;
6. time/room/ambient context;
7. broader recommendation model.

The user should always be able to say:

- "لا تشغّل هاد النوع."
- "مو هلق."
- "شغّل شي أهدى."
- "اختار إنت."
- "من قائمتي بس."

These corrections should update the current session context immediately and update long-term preferences only when the memory policy permits it.

## Permissions and Safety

Natural language does not bypass authorization.

The execution layer must still enforce capabilities such as:

- `device.control`
- `app.open`
- `media.control`
- `media.search`
- `media.transfer`
- `game.launch`
- `display.render`
- `display.companion.move`

Higher-risk actions such as purchases, account modifications, installations or destructive actions require stronger approval policies.

## Core Rule

The user should not have to think in terms of devices, applications or APIs.

MUDRIK should understand the user's intent, resolve the right authorized device and application, preserve session continuity, use ambient context to improve recommendations, and execute through strict adapters and permissions.
