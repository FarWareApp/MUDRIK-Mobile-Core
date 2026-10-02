# App ↔ Brain Contract

## Purpose
Keep MUDRIK Mobile independent from any intelligence implementation.

The UI does not know who produced a response.

## Input envelope

Possible input kinds:

- text
- voice
- image
- video
- file
- command
- structured-event

Minimum conceptual fields:

- id
- conversationId
- kind
- createdAt
- payload
- attachments
- metadata

## Output envelope

Possible output kinds:

- text
- voice
- image
- video
- file
- action
- status
- error
- structured-result

Minimum conceptual fields:

- id
- conversationId
- kind
- createdAt
- payload
- attachments
- metadata

## Transport states

- idle
- sending
- processing
- streaming
- completed
- cancelled
- failed

## Critical isolation rule

Chat UI MUST NOT know whether a response originated from:

- Mock processor
- Offline model
- Online provider
- Server
- Local command handler
- Tool execution
- Future MUDRIK Brain

Replacing one implementation with another must not require
rewriting Chat UI.


## Implemented transport boundary

The conceptual contract above now has a strict provider-independent runtime
foundation under src/core/brain.

The runtime envelope deliberately carries opaque payload and attachment
references instead of provider credentials or provider-specific request bodies.
Payload resolution belongs behind the BrainPort boundary.

Implemented invariants include:

- exact-schema parsing with bounded identifiers and references;
- request/session/trace/conversation binding;
- explicit input and output kind registries;
- deadline and language metadata;
- zero authority inheritance from model output;
- strict streaming sequence numbers;
- replay/idempotence detection;
- monotonic event time;
- terminal lifecycle enforcement;
- explicit cancellation;
- bounded request registry capacity;
- safe release only after terminal completion, failure or cancellation.

An error output must carry a reason code and no payload. A non-error output must
carry a payload reference and no error reason. This prevents ambiguous success
and failure envelopes.

## Authority rule

A Brain response is information, not permission.

No Brain input, output, stream event, model consensus or transport result may
grant execution, sensor, approval or capability authority. Those authorities
remain owned by the dedicated capability, approval and action-time policy
systems.

## Provider replacement rule

BrainPort is the stable interface. An offline model, cloud model, multi-model
router, server transport or future MUDRIK Brain may implement it without
changing presentation code.

The payload store is also abstracted so transport implementations can choose
encrypted local storage, secure IPC, server upload or another mechanism without
putting provider-specific logic into the app UI.
