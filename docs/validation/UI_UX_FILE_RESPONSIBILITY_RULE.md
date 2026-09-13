# UI/UX File Responsibility Rule

For the UI hardening workstream, each file must have one primary responsibility.

Allowed examples:

- one visual primitive per file;
- one formatter per file;
- one interaction-state mapper per file;
- one screen-level composition file that wires smaller parts together.

Not allowed:

- permission requests inside visual button primitives;
- transport/network calls inside presentational components;
- persistence inside typography/layout components;
- device capability policy inside screen styling;
- duplicate state machines across screen and core layers.

Screen files may compose child components and pass callbacks/state, but should not absorb logic that belongs to reusable services, policies or formatting modules.
