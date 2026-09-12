# MUDRIK Mobile Core Architecture

## Status
Canonical architecture for MUDRIK Mobile Core 1.0.

## Primary Rule
The mobile application is a complete standalone product shell.

It MUST NOT depend on:
- AI providers
- local LLMs
- remote LLMs
- MUDRIK server
- Ollama
- OpenAI
- memory engine
- command engine
- automation engine

Those systems are integrated later only through stable contracts.

## Architecture Zones

### 1. Presentation
Responsible only for displaying state and collecting user interaction.

Examples:
- screens
- buttons
- inputs
- message bubbles
- dialogs
- sheets
- menus
- visual states

Presentation MUST NOT contain:
- AI calls
- server calls
- database implementation
- permission implementation
- platform-specific business logic

### 2. Application Core
Provides non-intelligent mobile capabilities.

Includes:
- navigation
- storage
- permissions
- lifecycle
- files
- audio UI infrastructure
- settings
- localization
- accessibility
- security
- diagnostics
- logging
- errors
- connectivity state

### 3. Intelligence Boundary
A replaceable external world.

Future systems:
- MUDRIK Brain
- Offline AI
- Online AI
- Memory
- Commands
- Tools
- Automation
- Server

The app communicates with this world only through contracts.

## Future Server / Control Plane Boundary

The future MUDRIK server is not an ordinary best-effort backend. Its accepted target is a high-assurance, low-latency, durable Control Plane defined in:

- `MUDRIK_REALTIME_CONTROL_PLANE.md`
- `MUDRIK_COMPUTER_AUTONOMY.md`
- `MUDRIK_SECURITY_BASELINE.md`

The future Control Plane must preserve this Mobile Core boundary. It may implement stable transport/application contracts after the Mobile Core freeze, but no presentation or core module may become directly coupled to gateway, broker, database, cloud vendor, or AI-provider implementation details.

## Dependency Direction

Presentation
    ↓
Feature Controller
    ↓
Core Contract / Repository Contract
    ↓
Platform Adapter

Intelligence adapters may implement contracts later.

Dependencies MUST NOT point from Core toward a concrete AI implementation.

## Completion Rule
A feature is not DONE merely because it renders.

DONE requires, where applicable:
- specification
- UI states
- error states
- permissions
- persistence
- lifecycle behavior
- RTL/LTR
- accessibility
- tests
- diagnostics
- real-device validation

## Core Release Standard
MUDRIK Mobile Core 1.0 may be frozen when there are:

- zero known blocking defects
- zero known critical defects
- no known missing foundation component
- clean typecheck
- clean project diagnostics
- successful real-device smoke tests
