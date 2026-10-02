# MUDRIK Agent Goal Execution

## Status

Implemented internal foundation on the isolated backend/competition worktree.

## Purpose

MUDRIK must not behave like a chat box that emits text and assumes success.
A user goal is treated as a bounded execution lifecycle:

    Brain request
      -> goal contract
      -> provider-independent plan
      -> execute
      -> verify
      -> repair when needed
      -> re-verify
      -> finalize with evidence

The lifecycle itself has no authority to perform an external action. Tool,
device, filesystem, network, integration and security capabilities remain
owned by their dedicated authorization systems.

## Goal contract

A goal declares:

- source Brain request;
- workspace scope;
- intent class;
- risk level;
- verification mode;
- side-effect policy;
- step budget;
- tool-attempt budget;
- repair-cycle budget;
- creation time and optional deadline.

Critical-risk work requires strict verification. Operate/automate goals cannot
pretend to be read-only.

## Plan contract

Plans are provider-independent and ordered. Every step carries an opaque
operation reference, explicit dependencies, declared capability references,
side-effect metadata, approval requirement, optional rollback reference and
optional verification reference.

Plan validation rejects:

- unknown or malformed fields;
- step-count overflow;
- duplicate or forward dependencies;
- side effects in a read-only goal;
- side effects without approval;
- missing verification steps;
- invalid or side-effecting finalization.

Strict verification requires at least two verification steps. Standard
verification requires at least one.

## Execution lifecycle

The runtime tracker enforces:

- monotonic trusted time;
- hard deadline handling;
- one current step at a time;
- bounded tool attempts;
- bounded repair cycles;
- verification pass/failure accounting;
- retry of the same failed step after repair;
- verification completion before finalization;
- terminal cancellation, blocking and completion.

A failed tool or verification attempt cannot be hidden by a repair retry:
budgets include retries.

## Evidence chain

Every execution can emit a strict evidence journal. Events are bound to one
goal and one plan, use monotonic sequence numbers and link to the previous
event identifier.

The registry rejects:

- cross-goal or cross-plan events;
- sequence gaps;
- mutation of an already accepted sequence;
- broken predecessor links;
- time rollback;
- output after a terminal event;
- hidden authority fields.

Success, verification and finalization events require explicit evidence
references. Failure and block events require typed reason codes.

This provides protocol-level tamper detection and provenance. Cryptographic
signing can be layered on top later for stronger hostile-storage guarantees.

## Relationship to MUDRIK Brain

The Brain may understand, plan, reason and propose operations, but its output
never becomes permission. Brain output is converted into a goal/plan, then the
goal execution system and existing capability/approval systems re-check every
external action.

The result is intentional separation:

    intelligence quality != action authority

That separation is mandatory for a powerful agent that can operate real
devices without making model output a security bypass.
