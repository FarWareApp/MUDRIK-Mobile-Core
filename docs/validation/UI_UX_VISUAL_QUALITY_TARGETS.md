# UI/UX Visual Quality Targets

The hardening pass targets a lightweight, modern MUDRIK visual system rather than decorative complexity.

Targets:

- compact but comfortable spacing;
- clear visual hierarchy;
- restrained elevation and borders;
- large, consistent touch targets;
- fewer ambiguous glyphs;
- explicit states for focus, disabled, active generation and errors;
- dark-theme readability without heavy blocks;
- no permanent bottom navigation; floating `+` quick actions remain the intended navigation pattern;
- mixed Arabic/German/English text must remain readable and directionally correct;
- motion must degrade gracefully under Reduced Motion;
- accessibility labels must describe action, not icon shape.

The visual system must remain implementation-friendly: components should be independently replaceable without changing transport, persistence, permission or security behavior.
