# MUDRIK Emergency Guardian Architecture

## Goal

MUDRIK Emergency Guardian is an opt-in safety subsystem intended to detect patterns that may indicate a serious emergency and help the user obtain assistance quickly.

It must not claim to diagnose a heart attack, stroke, arrhythmia, seizure or other medical condition from a single consumer sensor, camera frame or AI inference.

Its job is to detect a potentially dangerous situation, estimate confidence from multiple authorized signals, attempt rapid confirmation when possible, and escalate to trusted contacts or emergency services according to user settings, platform capabilities, jurisdiction and validated medical-product requirements.

## Core Principle

`Detect risk -> corroborate -> assess responsiveness -> escalate proportionally -> preserve evidence/audit -> stop when resolved`

A single elevated heart-rate reading must never be enough by itself to label a heart attack or trigger an irreversible emergency workflow.

The system should prefer corroborated evidence such as multiple independent abnormal signals, sudden loss of responsiveness, a detected fall, abnormal breathing pattern, user-reported severe symptoms, or strong neurological warning signs.

## Possible Authorized Inputs

Emergency Guardian may consume only signals that the user has explicitly enabled and that the platform/device actually exposes.

Possible inputs include:

- wearable heart rate;
- wearable ECG classifications where officially exposed;
- oxygen saturation where officially exposed and reliable enough for the intended use;
- respiratory rate where available;
- accelerometer / gyroscope fall events;
- sudden loss of motion after a fall;
- device-worn state;
- phone/watch proximity;
- user speech and distress phrases;
- user-reported symptoms;
- camera-based posture / collapse detection;
- camera-based responsiveness checks;
- camera-based facial asymmetry or gross motor asymmetry only as a possible warning signal, not a diagnosis;
- speech changes such as sudden severe slurring only as a possible warning signal;
- smart-home presence sensors;
- previously configured medical profile / risk factors only when the user explicitly chooses to store and use them;
- current medication emergency instructions only when explicitly configured;
- emergency contact preferences;
- location sufficient for emergency routing where permissioned.

Raw camera or microphone streams should be processed locally where practical. Continuous cloud upload should not be the default.

## Signal Fusion

Each input should carry:

- source;
- timestamp;
- freshness;
- confidence;
- expected error characteristics;
- user/device identity confidence;
- whether the reading is current or historical;
- whether the sensor is consumer-grade or medically validated for the relevant purpose.

The system should combine independent signals instead of treating one noisy measurement as truth.

Example risk patterns:

### Pattern A — Elevated heart rate only

- abnormal heart rate;
- user is responsive;
- no fall;
- no severe symptom report;
- no other corroborating signal.

Action: notify/check in, re-measure if possible, do not diagnose, do not automatically call emergency services solely from this signal.

### Pattern B — User reports severe chest pain + shortness of breath

Action: treat as a high-priority emergency report, strongly recommend immediate emergency help and expose the emergency-call flow without waiting for model speculation.

### Pattern C — Fall + no response + abnormal vital pattern

Action: critical escalation path. Attempt a very short responsiveness check, then escalate according to the user's configured emergency policy and supported local emergency-service integration.

### Pattern D — Possible stroke warning pattern

Possible corroborating signals may include:

- sudden facial asymmetry;
- sudden one-sided arm weakness or inability to keep one arm raised;
- sudden major speech difficulty;
- sudden loss of balance or vision complaint;
- explicit user report of such symptoms.

The system should describe this as a possible neurological emergency, not assert a definitive stroke diagnosis.

## User-Visible Risk States

Suggested internal states:

- `normal`
- `watch`
- `check_user`
- `urgent`
- `critical`
- `escalating`
- `resolved`

Suggested behavior:

### normal

No intervention.

### watch

Quietly re-check or collect another authorized reading.

### check_user

Ask a short direct question such as:

`"Are you okay?"

"I detected something unusual. Do you need help?"`

The user can answer by voice, tap, gesture or wearable control.

### urgent

Present a prominent emergency interface and offer immediate contact with emergency services or a trusted person.

### critical

Used only when a combination of signals strongly suggests immediate danger, for example prolonged unresponsiveness after a detected collapse plus corroborating evidence.

A configurable short countdown may be used where appropriate. The user must be able to cancel if conscious.

If the user is unresponsive and automatic emergency escalation has been explicitly enabled, MUDRIK may initiate the strongest supported escalation that is legally and technically permitted in the user's jurisdiction.

## Emergency Escalation Ladder

Possible order:

1. voice + haptic check-in;
2. full-screen emergency confirmation;
3. notify trusted emergency contact;
4. share configured emergency location and relevant status with that contact;
5. initiate an emergency-service call / emergency communication where the operating system, carrier, integration and local law permit;
6. continue local audible guidance while awaiting help;
7. keep a minimal timestamped event log for later review.

Emergency escalation must not be routed through the ordinary conversational queue if doing so would introduce avoidable delay.

## Emergency Calling

The emergency number must be resolved by jurisdiction rather than hard-coded globally.

For supported European Union contexts, `112` is the single EU emergency number.

The architecture must account for platform restrictions. If an operating system does not allow unattended automatic calling, MUDRIK should use the fastest permitted emergency flow instead of pretending that an automatic call succeeded.

The interface must make it unmistakably clear whether:

- a call has actually been placed;
- a contact has been notified;
- location has been shared;
- the system is still waiting for user confirmation.

## Emergency Packet

When legally supported and explicitly authorized, an emergency packet may contain the minimum necessary information such as:

- user-selected display name;
- approximate/current location;
- timestamp;
- suspected emergency category, expressed as `possible` rather than definitive diagnosis unless supplied by a validated medical subsystem;
- responsiveness state;
- detected fall state;
- recent high-level sensor anomalies;
- user-reported symptoms;
- known emergency contacts;
- user-selected important medical notes;
- preferred language.

Do not transmit unrelated conversation history, private files, or broad account data.

## Voice Behavior During Emergencies

The companion should change interaction style automatically:

- very short sentences;
- no jokes;
- no unnecessary explanation;
- clear questions requiring easy answers;
- repeat critical instructions when needed;
- support yes/no responses;
- support voice interruption;
- keep audio volume appropriate and accessible;
- offer multilingual emergency communication when supported.

The companion personality must never override emergency policy.

## Camera Use

Camera-based emergency monitoring is strictly opt-in.

Required constraints:

- explicit camera permission;
- clear indication when monitoring is active;
- local processing preferred;
- no hidden recording;
- no facial-expression claim should be treated as a medical diagnosis;
- avoid storing raw footage unless the user explicitly enables a defined retention purpose;
- shared/home cameras must respect room/device privacy policy;
- presence of another person must not silently enroll that person into health monitoring.

Camera models may identify gross events such as collapse, prolonged immobility, or inability to follow a simple responsiveness prompt, but these are supporting signals only.

## False Positive and False Negative Policy

Emergency Guardian must be evaluated for both missed emergencies and unnecessary escalations.

The system must track metrics such as:

- sensitivity by scenario;
- specificity by scenario;
- false emergency escalation rate;
- missed critical-event rate;
- time to first check-in;
- time to escalation;
- cancellation success;
- sensor dropout behavior;
- demographic / device performance differences where lawful and appropriate;
- behavior under poor lighting, noise, loose wearables and network loss.

Do not hide uncertainty from the user.

## Offline Behavior

Core emergency behavior should degrade safely when internet access is unavailable.

Possible offline-capable functions:

- local fall detection;
- local responsiveness check;
- local alarm;
- direct emergency call through the phone network where supported;
- cached emergency contacts;
- locally available location information;
- local wearable readings.

Cloud AI must not be a single point of failure for immediate emergency escalation.

## Permissions

Emergency Guardian needs its own permission domain, separate from ordinary MUDRIK tools.

Example capabilities:

- `health.read.heart_rate`
- `health.read.ecg`
- `health.read.oxygen`
- `health.read.motion`
- `health.read.respiratory`
- `emergency.camera.observe`
- `emergency.microphone.observe`
- `emergency.location.read`
- `emergency.contact.notify`
- `emergency.call.initiate`
- `emergency.medical_profile.read`

Permissions should be revocable independently.

## User Configuration

The user should be able to configure:

- Emergency Guardian on/off;
- which wearables are trusted;
- which health signals may be used;
- whether camera monitoring is allowed and in which rooms/devices;
- emergency contacts;
- automatic escalation preference;
- countdown duration where appropriate;
- location sharing policy;
- medical information that may be shared;
- language;
- accessibility needs;
- quiet / privacy rules that must *not* suppress critical emergency alarms.

The user must be able to review and test the emergency flow without contacting real emergency services.

## Test / Simulation Mode

A dedicated simulation mode is mandatory.

It should allow testing:

- fall detected;
- user unresponsive;
- abnormal heart-rate scenario;
- stroke-warning scenario;
- network unavailable;
- wearable disconnected;
- camera unavailable;
- emergency contact unreachable;
- cancellation during countdown;
- platform refusing automatic call;
- location unavailable.

Simulation mode must never place a real emergency call.

## Regulatory Boundary

If MUDRIK is marketed or technically intended to diagnose, predict, monitor or influence medical decisions, parts of Emergency Guardian may qualify as medical device software depending on jurisdiction and intended purpose.

For the EU, medical device software qualification/classification and Rule 11 must be reviewed before release of any feature that provides information for diagnosis/therapy decisions or monitors physiological processes.

Before production medical claims:

1. define intended purpose precisely;
2. obtain regulatory/legal review;
3. determine medical-device classification;
4. establish clinical/performance evaluation;
5. implement required quality/risk/cybersecurity processes;
6. validate supported sensors and device combinations;
7. document residual risk and human factors;
8. complete any required conformity assessment / registration before release.

Do not ship a medical-diagnosis claim by simply adding an AI model to consumer sensor data.

## Initial Delivery Order

1. emergency settings/profile model;
2. trusted-contact escalation;
3. user-triggered emergency voice command;
4. fall + responsiveness workflow using platform-supported signals;
5. wearable signal adapters;
6. local risk fusion engine;
7. emergency simulation mode;
8. jurisdiction-aware emergency routing;
9. optional camera corroboration;
10. only after regulatory validation, enable any medically characterized automated detection claims.

## Core Rule

MUDRIK Emergency Guardian should react quickly to possible danger without pretending that uncertain sensor data is a medical diagnosis.

Emergency help must be fast, transparent, privacy-preserving, independently permissioned and capable of operating without relying on a long conversational AI round trip.