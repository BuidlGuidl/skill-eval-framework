# Record schemas

Reference for the three yaml records plus the verifier contract. Types live in `lib/types.ts`; this file is the human-readable version.

## Task spec — `tasks/<id>.yaml`

```yaml
id: x402-payment-gate-001
skill: x402                    # skill name; also the install dir name in the workspace
domain: ethereum-app
input: "Add payment-gated API routes to this SE-2 app."
workspace:                     # exactly one of repo+commit or template
  repo: scaffold-eth/scaffold-eth-2
  commit: abc123
  # template: templates/blog-draft   # alternative: local dir copied as the workspace
variants:
  - no_skill
  - current_skill
variant_overlays:              # optional: dir copied over the workspace for that variant
  agents_md_index: overlays/x402-agents-md/
skill_source:
  path: ../sandgarden-skills/skills/x402
verifier:
  type: assertions
  file: verifiers/x402-payment-gate.ts
success_metric: pass_rate
runs_per_variant: 5
notes: "Executor must not see assertions."
```

Rules that make results comparable:

- `input` is identical for every variant. If you need a different prompt, that's a different task.
- `runs_per_variant` below 3 tells you almost nothing; single runs are noise.
- The verifier file never enters a workspace. `setup-workspace` enforces this.

## Result record — `artifacts/<task-id>/<run-id>/result.yaml`

Written by `yarn verify`. The orchestrator fills the nulls afterwards from what it observed while spawning the executor.

```yaml
task_id: x402-payment-gate-001
run_id: 2026-07-01T120000Z-current-skill-3
variant: current_skill
model: claude-opus-4-6         # null until the orchestrator fills it
skill_version: git:abc123      # from setup; null when no skill installed
pass: true                     # every assertion passed
score: 9
max_score: 10
assertions:
  v2_api: pass
  caip2_network: pass
  show_calls_status: fail
metrics:
  seconds: 217                 # nulls until the orchestrator fills them
  input_tokens: 18000
  output_tokens: 3000
failure_tags:
  - missing-status-hook
artifacts:
  diff: run.diff
  transcript: transcript.md    # gitignored, machine-local
```

Runs are append-only. A re-run after a skill patch is a new run id; never overwrite history.

## Mistake record — `mistakes/<skill>/<mistake-id>.yaml`

The part that makes the framework useful. Scores say whether the skill helped; mistakes say what to write next.

```yaml
mistake_id: x402-old-package-api
skill: x402
first_seen: 2026-03-10
frequency:
  no_skill: 5/5
  current_skill: 0/5
category: api-version-gap
symptom: "Model imports old x402-fetch / x402-next packages."
expected_pattern: "Use @x402/core and @x402/next with paymentProxy and x402ResourceServer."
skill_section: "v2 setup"      # the section that should prevent this, or "none" for a gap
status: fixed                  # open | fixed | wontfix
```

## Verifier contract — `verifiers/*.ts`

A verifier default-exports a function from workspace path to report:

```ts
import type { Verifier } from "../lib/types";

const verify: Verifier = async workspacePath => ({
  assertions: {
    v2_api: /* deterministic check */ ? "pass" : "fail",
  },
});

export default verify;
```

Deterministic checks first: file assertions, builds, tests, AST checks, final state. Rubric-based judging only where determinism can't capture the work, and then the rubric is written before the run and hidden from the executor.

## Report ending — `reports/<task-id>-<date>.md`

Every report ends with the same table:

| Question | Answer |
| --- | --- |
| Did the skill improve pass rate? | `+N pp` |
| Did it reduce time/tokens? | yes/no |
| Did it create negative deltas? | list them |
| What mistakes repeated without the skill? | mistake ids |
| What mistakes remained with the skill? | mistake ids |
| What should change in the skill? | concrete edits |
| What should change in the eval? | missing or weak assertions |

The last row is there on purpose. Sometimes the eval is the wrong artifact, not the skill.
