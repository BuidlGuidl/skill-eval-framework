# building-blocks — benchmark summary

Three benchmarks of the ethskills `building-blocks` skill, all on the same rig: executor
**codex/gpt-5.5** (reasoning high, offline), judge **claude/claude-opus-4-8** held constant, 3
runs per variant, blind grading under the patched `verify` (722fe83). Skill vendored from
`../ethskills` @ `191dcc1`.

## Scoreboard

| Benchmark | Prior under test | `no_skill` | `with_skill` | Verdict |
| --- | --- | --- | --- | --- |
| `base-dex-swap-001` | Base's deepest DEX is Aerodrome, not Uniswap | **0/3** | **2/3** | skill helped |
| `aave-flashloan-fee-001` | Aave V3 flash-loan fee is 5 bps, not V2's 9 | **3/3** | **3/3** | ceiling |
| `uniswap-v4-hook-fee-001` | V4 hook fee override uses `0x400000`, not `0x800000` | **3/3** | **3/3** | ceiling |

One benchmark of three had any headroom. The other two, the model already knew the answer cold.

## The one thing worth carrying forward

**gpt-5.5 already knows most of what this skill teaches.** Canonical mainnet facts — the Aave V3
Pool address, its 5 bps fee, the Uniswap V4 PoolManager (a mined vanity address, recalled
character-perfect), the correct hook override flag — all reproduced with no skill installed. The
skill was dead weight on two of three tasks.

The single prior that still bit was **L2-specific and less canonical**: which DEX dominates Base.
And even there the skill's *headline* ("don't default to Uniswap") only reproduced in 1 of 3
`no_skill` runs. What actually failed all three was the **contract address** — the model knew to
use Aerodrome but fabricated its router, correct prefix and invented tail. The skill earned its
one win by carrying a verified constant the model couldn't recall, not by correcting a belief.

That is the shape of where a knowledge skill still pays for itself against this model: **specific,
non-famous, L2-native constants** — not concepts, not mainnet canon, not mechanics the model can
derive.

## What the benchmarks found in the skill itself

Independent of pass rates — caught by verifying every expect line against primary sources before
running. Full list and fixes in `building-blocks-suggestions.md`.

1. **Broken hook code (highest severity).** `SKILL.md:75` returns `fee | 0x800000` from
   `beforeSwap`. The per-swap override flag is `0x400000`; `0x800000` is the dynamic-fee *marker*.
   The hook compiles and silently no-ops — the pool keeps charging its stored fee. gpt-5.5 rejected
   it and used `0x400000` in all 3 runs, even correcting the skill in prose, but a weaker model has
   nothing to override it with.
2. **Misdated merger.** Aerodrome/Velodrome "merged into Aero (November 2025)" is written as settled
   history. It was announced ~Jan 2026 with a Q2/Jul 2026 launch. A stale-prior skill shipping a
   stale prior.
3. **Stale TVL** (~$500-600M vs ~$323M today) and a **wrong Aave import path** (`SKILL.md:132`).

## What the benchmarks found in the eval

- `base-dex-swap-001`'s expects encode one specific Aerodrome router; a run that chose the
  defensible Slipstream alternative scored 1/4. The task can't tell "wrong DEX" from "right DEX,
  other router," so its `0/3` reads harsher than the model deserves.
- Two of three tasks were mis-aimed at mainnet canon the model already holds. **Lesson: stop
  drafting tasks around famous facts.** They ceiling out and tell you nothing.
- The harness bug this session fixed (PR #7): the judge was being shown the installed skill on
  repo-shaped runs, which inflated `base-dex-swap-001 with_skill` from a true 2/3 to 3/3.

## The open question this session could not close

Why did the model fabricate Aerodrome's address but recall Aave's and Uniswap's perfectly? Two
explanations are **perfectly confounded** in this skill: *placement* (Aerodrome sits in a `//`
comment; Aave and Uniswap sit in the address table) and *fame* (Aerodrome is L2-native and
less-referenced; the other two are mainnet canon). Every table entry is also a famous contract, so
no observational task can separate the two.

The only way to settle it is an **intervention**: move the Aerodrome addresses into the table,
change nothing else, re-run `base-dex-swap-001 with_skill`. If fabrication vanishes, placement
matters. If it persists, only fame does — and "put addresses in tables" is worthless advice.

## Bottom line for the skill-vs-model question

On this model, `building-blocks` is mostly redundant. Its concepts (flash loans, ERC-4626, hooks,
yield tokenization) are known; its mainnet constants are memorized. It retains value only as a
carrier of **fresh, specific, hard-to-recall constants** — current L2 addresses, current fees —
and only if those constants are **correct and maintained**, which this session showed they are not
uniformly (see the hook bug). A skill whose entire remaining edge is "trustworthy current
constants" is only as good as its maintenance discipline.
