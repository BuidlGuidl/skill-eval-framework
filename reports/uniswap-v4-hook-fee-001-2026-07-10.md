# uniswap-v4-hook-fee-001 — building-blocks

**Executor:** codex (gpt-5.5, reasoning high), offline
**Judge:** claude / claude-opus-4-8, constant across all six runs. `self_judged: false` throughout.
**Runs:** 3 per variant, under patched `verify` (722fe83).
**Skill:** ethskills `building-blocks`, vendored from `../ethskills` @ `191dcc1`.

## Headline

| Variant | Pass |
| --- | --- |
| `with_skill` | **3/3** |
| `no_skill` | **3/3** |

Ceiling again. Twelve of twelve checks passed in both variants. No mistake records filed.

The headline is the least interesting thing in this report.

## The skill contains a silent, compiling bug — and the model refused to copy it

`SKILL.md:75`, in the dynamic-fee hook snippet:

```solidity
return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | 0x800000);
```

From `Uniswap/v4-core`, `src/libraries/LPFeeLibrary.sol`:

```solidity
uint24 public constant DYNAMIC_FEE_FLAG   = 0x800000;  // marks a pool dynamic-fee at init
uint24 public constant OVERRIDE_FEE_FLAG  = 0x400000;  // signals a per-swap override
function isOverride(uint24 self) internal pure returns (bool) {
    return self & OVERRIDE_FEE_FLAG != 0;
}
```

`fee | 0x800000` fails `isOverride()`. The PoolManager discards the returned fee and charges the
pool's stored fee. **The hook compiles, deploys, runs, and silently does nothing.** This is the
worst class of bug in a knowledge skill: not a stale number a reader would sanity-check, but
working-looking code that quietly no-ops.

This task was built to catch that propagating. It didn't propagate. **All three `with_skill`
runs used `0x400000`**, and each one went out of its way to correct the skill in `NOTES.md`:

> "The override bit is distinct from `DYNAMIC_FEE_FLAG` (`0x800000`, bit 23)." — run 1
> "For a dynamic-fee pool, identified by `PoolKey.fee == 0x800000`, the PoolManager reads…" — run 2

gpt-5.5 knew v4's fee flags better than the skill did and overrode it. That is a real result
about this executor, and it is **not** a reason to leave the bug in the skill — a weaker model,
or one prompted to follow the skill closely, has nothing to override it with.

## The table-vs-prose conjecture is dead, or at least unsupported

This task was the decisive test. The V4 PoolManager is a mined vanity address —
`0x000000000004444c5dc75cB358380D2e3dE08A90` — with a run of zeros and no memorable structure,
and it lives in the skill's "Key Protocol Addresses" table. The prediction: `no_skill` fabricates
it, `with_skill` copies it from the table.

**All three `no_skill` runs wrote it character-perfect from memory.** No fabrication. Again no
baseline, so the table again had nothing to prove.

Three benchmarks in, here is the whole address record:

| Protocol | Address | In skill as | `no_skill` behavior |
| --- | --- | --- | --- |
| Aave V3 Pool | `0x8787…4E2` | table row | recalled exactly, 3/3 |
| Uniswap V4 PoolManager | `0x0000…8A90` | table row | recalled exactly, 3/3 |
| Aerodrome Router | `0xcF77…4E43` | `//` comment | **fabricated, 2/3** |

I previously guessed the variable was *protocol obscurity*. The PoolManager kills that too: a
vanity address full of zeros, recalled perfectly. What actually separates the fabricated case is
that Aerodrome is an **L2-native, less-canonical protocol**, not that its address is oddly shaped
or that the skill kept it in a comment.

So the placement variable and the fame variable remain **perfectly confounded**: every table
address in this skill happens to be a canonical mainnet contract the model already knows, and the
one comment address happens to be the one it doesn't. No observational task can separate them,
because the skill's own content doesn't vary the two independently.

**The only way to settle it is an intervention.** Patch the skill — move the Aerodrome Router and
Factory into the address table, change nothing else — and re-run `base-dex-swap-001 with_skill`.
If run-4-style fabrication disappears, placement causes copying. If it persists, placement is
irrelevant and suggestion #1 is worthless. That is a clean A/B on a single edited line, and it is
the next thing worth running.

## Note on runs

`with_skill` run 1 was set up, killed mid-execution by a 10-minute shell timeout, and never
graded. Its run dir was deleted and the run redone under a fresh id — an aborted, ungraded setup
is not a record, which is what `setup`'s own failure path assumes. The three graded `with_skill`
runs are independent and complete.

## Summary

| Question | Answer |
| --- | --- |
| Did the skill improve pass rate? | No. `3/3` vs `3/3`. Ceiling; no headroom. |
| Did it reduce time/tokens? | Not measured. |
| Did it create negative deltas? | **No, but it tried.** The skill's hook snippet returns `fee \| 0x800000`, which silently disables the fee override. All three `with_skill` runs rejected it, used `0x400000`, and corrected the skill in prose. The bug is real; this executor is just immune. |
| What mistakes repeated without the skill? | None. |
| What mistakes remained with the skill? | None. |
| What should change in the skill? | **Fix `SKILL.md:75` — `fee \| 0x400000`, not `0x800000`.** Highest-severity defect found so far: it compiles and silently no-ops. See `building-blocks-suggestions.md`. |
| What should change in the eval? | This task, like `aave-flashloan-fee-001`, grades knowledge gpt-5.5 already has. Both are ceilings. Stop drafting tasks around canonical mainnet facts — this model knows them. The remaining live question is causal, not observational: patch the skill's address table and re-run `base-dex-swap-001` as a true A/B. Also worth testing this same task against a weaker executor, where the `0x800000` snippet may well propagate. |
