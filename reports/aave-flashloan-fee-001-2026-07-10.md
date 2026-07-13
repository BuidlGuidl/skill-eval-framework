# aave-flashloan-fee-001 — building-blocks

**Executor:** codex (gpt-5.5, reasoning high)
**Judge:** claude / claude-opus-4-8, constant across all six runs. `self_judged: false` throughout.
**Runs:** 3 per variant. First benchmark under the patched `verify` (722fe83) — judge evidence
verified free of skill material on every `with_skill` run.
**Skill:** ethskills `building-blocks`, vendored from `../ethskills` @ `191dcc1`.

## Headline

| Variant | Pass |
| --- | --- |
| `with_skill` | **3/3** |
| `no_skill` | **3/3** |

**The task hit the ceiling. It does not discriminate, and it says nothing about the skill.**

Every run in both variants passed all four checks. No mistake records were filed, because no
run made a mistake.

## What the task was for, and why it failed

Two hypotheses were on trial. Both came out unusable, for the same reason.

**(1) The stale prior.** Aave V2 charged 9 bps for a flash loan; Aave V3 charges 5. A model
quoting the V2 figure would be the exact failure this library exists to correct, and the
arithmetic is unbluffable — 1,000,000 USDC repays 1,000,500 at 5 bps, 1,000,900 at 9 bps.

There is no prior to correct. All three `no_skill` runs stated "5 basis points (0.05%)" and
computed 1,000,500 USDC, unprompted, with no network access. gpt-5.5 simply knows this.

**(2) The table-vs-prose hypothesis.** `base-dex-swap-001` produced a strong conjecture:
*addresses in a markdown table get copied, addresses in prose get regenerated from memory.*
There, the Aerodrome router lived only in a trailing `//` comment, and `with_skill` run 4
fabricated it anyway. The Aave V3 Pool, by contrast, sits in the skill's "Key Protocol
Addresses" table. If the conjecture held, `with_skill` should copy it while `no_skill`
fabricated.

`no_skill` never fabricated. All three runs wrote
`0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` character-perfect from memory. With no
fabrication baseline, the table had nothing to prove.

**This is the more interesting finding.** In `base-dex-swap-001` the model fabricated the
Aerodrome router and factory with correct prefixes and invented tails. Here it reproduced the
Aave Pool exactly. The difference is not table-vs-prose — it is **how famous the protocol is**.
Aave V3's Pool is one of the most-referenced addresses in DeFi and is memorized. Aerodrome's
router is not.

So address fabrication tracks protocol obscurity, and this task chose a protocol far too
well-known to expose it. The table-vs-prose conjecture is **still untested**, and it needs a
protocol whose address the model does *not* have memorized but which the skill's table *does*
carry.

## Negative deltas: none observed

The skill was open in all three `with_skill` runs and changed nothing. Notably, it did not
mislead: `SKILL.md:132` imports `FlashLoanSimpleReceiverBase` from
`@aave/v3-core/contracts/flashloan-v3/base/`, which is not the real package path
(`@aave/core-v3/contracts/flashloan/base/`) and would fail `forge build`. No run copied it —
zero `@aave` imports across all six diffs.

That is not evidence the bad path is harmless. The task input says *"no external dependencies
are installed, so declare any interfaces you need directly in this repo,"* which routes agents
around the import entirely. The defect remains live for any task that does install deps.

## What this cost, and what it bought

Six codex runs to learn the task was mis-aimed. That is the eval working: the alternative was
shipping a skill edit justified by a benchmark that could not have detected whether the edit
helped.

The suggestion in `building-blocks-suggestions.md` #1 — move the Base addresses into the
address table — is **still the right edit**, still supported by `base-dex-swap-001` run 4, and
**still not causally confirmed**. It rests on one observation.

## Summary

| Question | Answer |
| --- | --- |
| Did the skill improve pass rate? | No. `3/3` vs `3/3`. Ceiling; the task has no headroom. |
| Did it reduce time/tokens? | Not measured. |
| Did it create negative deltas? | None observed. The skill's wrong Aave import path was never exercised — the task's "no external deps" instruction routes around it. |
| What mistakes repeated without the skill? | None. No mistake records filed. |
| What mistakes remained with the skill? | None. |
| What should change in the skill? | Nothing on this evidence. The Aave section is correct: 5 bps and the Pool address both check out on-chain (`FLASHLOAN_PREMIUM_TOTAL()` returns 5). The separately-known import-path defect stands, unexercised. |
| What should change in the eval? | **The task, not the skill, is the wrong artifact.** It grades knowledge the model already has. Retire it as a discriminator, or keep it as a cheap regression check that the skill does not *break* correct behavior. To actually test the table-vs-prose conjecture, pick a protocol the model cannot recall — Uniswap V4's PoolManager (`0x000000000004444c5dc75cB358380D2e3dE08A90`, a mined vanity address with no memorable structure) is in the skill's table and is a strong candidate. |
