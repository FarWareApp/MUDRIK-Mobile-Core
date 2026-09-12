# MUDRIK Observation Privacy Architecture

## Goal

MUDRIK must always be truthful about whether it is currently observing or monitoring the user through any MUDRIK-controlled sensor, ambient presence stream or passive analysis feature.

The user must be able to stop observation immediately using natural language and keep it stopped until they explicitly re-enable it.

This policy is enforced below the language model. No model, companion personality, automation, emergency workflow or tool may silently override the user's current observation state.

## Truthful Answers

When the user asks questions such as:

- "هل تراقبني؟"
- "عم تشوفني؟"
- "هل الكاميرا شغالة؟"
- "هل تسمعني؟"

MUDRIK must answer using actual runtime state, not a generic canned response.

Examples:

If visual observation is active:

`"نعم. الرؤية مفعلة الآن عبر كاميرا الصالون المصرح بها."`

If visual observation is off but microphone wake detection is active:

`"لا أراقبك بالكاميرا الآن. الاستماع لكلمة التنبيه فقط ما زال مفعلاً."`

If all ambient observation is off:

`"لا. المراقبة المحيطية متوقفة الآن."`

If state cannot be verified:

`"لا أستطيع تأكيد الحالة الآن، لذلك أعتبر المراقبة متوقفة حتى أتحقق."`

MUDRIK must never claim a sensor is off unless the runtime control plane confirms that MUDRIK is not using it.

## Natural Privacy Commands

### Visual-only commands

Examples:

- "غمّض عيونك"
- "سكر عيونك"
- "لا تشوفني"
- "وقف الكاميرا"

These commands immediately disable all MUDRIK visual observation sources for the current user/session scope.

State:

`visual_observation = off`

MUDRIK may continue non-visual capabilities that remain permitted, such as direct voice interaction, unless the user asked for broader monitoring to stop.

### Visual resume commands

Examples:

- "افتح عيونك"
- "فيك تشوف هلق"
- "شغّل الكاميرا"

These commands request visual observation again.

Reactivation is allowed only if:

1. the user explicitly requested it;
2. the relevant camera/device permission still exists;
3. the destination sensor/device is currently trusted;
4. the current privacy policy allows observation;
5. any platform-level permission is granted.

The command must not silently re-grant an OS permission that the operating system has revoked.

### Broad monitoring-stop commands

Examples:

- "لا تراقبني"
- "وقف المراقبة"
- "بدي خصوصية"
- "خليني لحالي"

These commands immediately disable MUDRIK passive ambient observation, including any enabled combination of:

- visual observation;
- passive room monitoring;
- presence tracking used only for companion follow-me;
- ambient scene analysis;
- continuous environment analysis;
- passive health-observation streams controlled by MUDRIK where the user's policy says this command covers them.

State:

`ambient_observation = off`

Direct user-initiated interaction may continue. For example, the user may still tap the microphone and ask a question without re-enabling passive observation.

## Explicit Resume

Once the user stops observation, it remains off until the user explicitly re-enables it.

Examples:

- "راقب من جديد"
- "رجّع المراقبة"
- "افتح عيونك"
- "فعّل Follow Me مرة ثانية"

Time passing, app restart, model restart, device handoff, room change, companion movement or a new conversation must not silently re-enable observation.

The preference must survive restarts when technically feasible.

## State Machine

Suggested top-level state:

- `active`
- `visual_off`
- `ambient_off`
- `privacy_lock`
- `unavailable`

`privacy_lock` is a strong user-requested state in which passive observation cannot resume until the user explicitly unlocks it.

Transitions must be deterministic and auditable.

Example:

`active -> "غمّض عيونك" -> visual_off`

`active -> "لا تراقبني" -> privacy_lock`

`privacy_lock -> ordinary conversation -> privacy_lock`

`privacy_lock -> "يمكنك المراقبة من جديد" -> active (after permission checks)`

## Sensor-Level Runtime Truth

MUDRIK should maintain a live sensor-state registry containing at minimum:

- sensor/device ID;
- sensor type;
- active/inactive state;
- why it is active;
- which feature is consuming it;
- last state transition;
- local/remote processing mode;
- retention mode;
- current privacy scope.

Examples of sensor types:

- camera;
- microphone;
- UWB;
- Bluetooth proximity;
- location;
- room presence sensor;
- watch heart-rate stream;
- motion sensor;
- AR/VR spatial sensor.

The companion's verbal answer must be generated from this registry.

## Visible Privacy Indicators

Whenever MUDRIK is actively observing through a sensitive sensor, the user should have a persistent visible indicator where the platform allows it.

Examples:

- camera icon / eye icon;
- microphone icon;
- location icon;
- health-monitoring icon;
- room-presence icon.

The user should be able to open a simple panel showing:

- what MUDRIK is using now;
- why it is using it;
- which device is the source;
- whether processing is local or remote;
- how to stop it immediately.

## Companion Behavior

The companion may use natural language such as "أنا شايف المشهد الآن" only when the visual observation state confirms that it has a current authorized visual stream.

It must not role-play sight, hearing or awareness that it does not actually have.

If the user says "غمّض عيونك", the avatar may optionally animate closing its eyes, but the animation is only presentation. The real privacy state change must happen in the sensor-control layer first.

Likewise, "افتح عيونك" may animate the avatar only after the sensor-control layer has approved reactivation.

## Device Handoff

Observation state follows the user/session policy across trusted device handoff.

If the user disabled visual observation on the phone, moving the companion to a television, smart display or AR/VR headset must not automatically restore visual observation.

A destination device must independently satisfy its own permissions and trust requirements.

## Emergency Guardian Interaction

Emergency monitoring must respect the user's configured privacy policy.

Default rule: a direct user command to stop observation takes effect immediately.

If the product later offers an optional emergency override policy, it must be:

- explicitly configured in advance by the user;
- narrowly scoped to clearly defined emergency conditions;
- shown prominently in settings;
- independently revocable;
- never implied by ordinary companion use.

Without such an explicit emergency override policy, `privacy_lock` remains authoritative even during an emergency workflow.

## Platform Limits

MUDRIK can only control MUDRIK's own use of sensors and integrations.

If the operating system, another application, the smart-home vendor or another household member is independently using a camera or microphone, MUDRIK must not falsely claim it disabled that unrelated use.

When relevant, MUDRIK should say:

`"أنا أوقفت استخدام MUDRIK للكاميرا، لكن ما بقدر أضمن إذا تطبيق أو نظام ثاني عم يستخدمها."`

## Security Rules

- Observation is opt-in where required.
- User stop commands have immediate priority over convenience features.
- No silent restart of observation.
- No model may bypass the privacy state machine.
- No companion personality may override privacy.
- No device handoff may restore disabled observation.
- No background task may reactivate a disabled sensor without an explicit allowed policy.
- All state transitions should be auditable.
- Camera frames and sensor streams should be processed locally where practical.
- Raw sensitive sensor data should not be retained by default.

## Core Rule

MUDRIK must be able to answer the question "هل تراقبني؟" with a truthful, current and specific answer at any moment.

When the user says "لا تراقبني" or "غمّض عيونك", the underlying observation state changes immediately and remains stopped until the user explicitly re-enables it.