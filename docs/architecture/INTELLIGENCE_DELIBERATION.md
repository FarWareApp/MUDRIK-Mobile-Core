# MUDRIK Intelligence Deliberation

Status: implemented foundation on the isolated competition branch.

## Goal

MUDRIK should not spend multi-model latency and cost on every request.
Simple work stays on the primary routed model. Hard, uncertain, externally
verifiable or tool-failing work can fan out to independent providers and pass
through a separate review stage.

The deliberation layer does not grant execution, sensor, approval or capability
authority. It only chooses among result references produced by the existing
provider-independent Intelligence Router.

## Adaptive routing

The default deliberation trigger considers:

- task complexity;
- uncertainty;
- whether external truth must be checked;
- whether a tool attempt failed;
- whether independent verification is mandatory;
- how many independent providers are actually available.

Mandatory verification fails closed if there are not enough independent
providers. Optional verification can degrade to the primary model instead of
blocking an ordinary user request.

## Parallel proposal plan

The deliberation execution planner consumes a validated Intelligence Route Plan.
It preserves the router's ordering, removes duplicate provider/model pairs and
selects a bounded proposal set.

The proposal budget is capped at five. This prevents an accidental fan-out from
turning a difficult request into uncontrolled provider spend or latency.

## Independent review

A provider/model pair cannot review its own proposal. Duplicate reviewer
bindings, stale reviews, future timestamps, cross-request data and cross-plan
data fail closed.

Each independent review scores:

- correctness;
- groundedness;
- instruction fit;
- policy compliance;
- optional tool evidence.

A rejection vetoes that proposal from verified selection. A proposal needs the
configured minimum number of independent accepted reviews and a minimum
aggregate review score.

## Disagreement handling

If two verified proposals are too close to separate by the configured winner
margin, MUDRIK returns needs_more_evidence instead of pretending that a weak
tie is certainty.

This is the intended path for later verifier escalation, evidence retrieval or
an additional independent model.

## Relationship to tools and actions

A strong answer is not action authority. Deliberation output remains a
non-authoritative result reference. Existing capability grants, approvals,
device trust checks and action-time revalidation remain independent blockers.

This separation is intentional: a consensus of models must never become a
shortcut around MUDRIK's security boundaries.

## Current validation

The branch includes contract tests for strict parsing, authority isolation,
adaptive routing, independent-provider enforcement, stale/duplicate review
rejection, rejection vetoes, proposal budgets, disagreement handling and
integration with the existing route-plan format.


## Provider execution coordinator

The internal intelligence layer now has a provider-independent execution
coordinator that consumes only route plans issued by the Intelligence Provider
Registry.

For each attempt it:

- resolves the exact provider/model binding from the issued plan;
- rejects an adapter whose runtime identity differs from that binding;
- creates a generation-bound attempt tracker;
- validates every adapter output through the existing strict output contract;
- buffers provider output internally until a final result reference exists;
- normalizes provider failures;
- applies the registry's issued-plan failover policy;
- rotates generation after partial output before crossing providers;
- stops on non-retryable failures;
- bounds provider attempts;
- enforces cancellation and a hard attempt timeout.

A provider cannot insert itself merely by returning a plausible adapter object.
The provider/model/service identity must match the current registered binding,
and the next provider must still be healthy at failover time.

Partial output from one provider is never mixed into the final result of a
fallback provider. If a failure occurs after output has been observed, failover
requires the existing explicit-restart and generation-rotation rules.
