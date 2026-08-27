# File Responsibility Rules

## Non-negotiable rule
One file = one primary responsibility.

## Forbidden patterns
Do not create:
- giant screen files
- god services
- shared utility dumping grounds
- components that directly access unrelated platform APIs
- UI components that directly know AI providers
- circular dependencies

## Screen responsibilities
A screen may:
- compose components
- connect view state
- trigger feature-level actions

A screen may NOT:
- implement database logic
- perform AI routing
- implement microphone internals
- implement file-system internals
- contain permission workflows
- contain network retry policies

## Naming
Names must explain responsibility.

Good:
- SendButton.tsx
- MessageComposer.tsx
- PermissionManager.ts
- ConversationRepository.ts

Bad:
- Helpers.ts
- Stuff.ts
- Manager.ts
- Utils2.ts
- Everything.tsx

## Growth rule
If a file starts gaining a second independent reason to change,
split it before continuing.

## Boundary rule
Features communicate through explicit public contracts,
not by importing internal files from another feature.
