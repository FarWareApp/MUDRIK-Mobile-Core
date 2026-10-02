# MUDRIK Benchmark Arena

Status: foundation implemented on isolated parallel branch.

## Purpose

The Benchmark Arena measures whether MUDRIK is actually improving against
external or internal contenders. It is not a marketing score and it does not
grant execution, sensor, approval, or capability authority.

Every benchmark case is versioned, bounded and reproducible. Every observation
is tied to one case, one contender and one numbered attempt.

## Core dimensions

- correctness
- completion
- tool reliability
- factuality
- recovery
- latency efficiency
- cost efficiency
- user-effort efficiency

Correctness and completion are mandatory for every case. Other dimensions are
declared explicitly per case so a contender is never rewarded for an
inapplicable metric.

## Required benchmark families

The production suite should cover reasoning, coding, debugging, research,
tool use, computer use, vision, voice, memory, multilingual behavior and
recovery.

Arabic, German and English need independent coverage. Results must not be
silently pooled in a way that hides language regressions.

## Evidence rules

External-truth cases are rejected unless the evaluator records that the truth
source was verified. Failed, timed-out or blocked attempts cannot retain
positive correctness or completion scores.

Raw burden remains visible beside quality: elapsed time, cost and user
interventions are reported separately. This prevents a high quality score from
hiding unacceptable latency, spend or manual work.

Duplicate case-attempt pairs are rejected by aggregation rather than counted
twice.

## Comparison protocol

Use blinded contender references during evaluation when practical. Bind every
run to an exact MUDRIK commit, benchmark-suite revision, runtime configuration
and model/provider configuration.

Do not tune a contender on hidden evaluation answers. Maintain a development
set and a held-out comparison set. Add regression cases when real defects are
found.

## Release use

Benchmark results are decision evidence, not release authority. Existing
production gates remain independent and must continue to fail closed.

A future release dashboard should show:
- score by category and language;
- task-completion rate;
- tool-success rate;
- factuality failures;
- recovery success;
- median and p95 latency;
- cost;
- required user interventions;
- regression delta against the previous exact release candidate.

The benchmark harness must never expose provider credentials, hidden evaluator
answers or security-sensitive payloads in public reports.
