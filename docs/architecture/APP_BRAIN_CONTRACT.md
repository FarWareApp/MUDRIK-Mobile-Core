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
