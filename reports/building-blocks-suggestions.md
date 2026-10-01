# building-blocks — suggested edits

From `base-dex-swap-001` (codex/gpt-5.5, blind claude-opus-4-8 judge, 3 runs per variant).
Result: `with_skill 2/3` vs `no_skill 0/3`. Full report: `base-dex-swap-001-2026-07-09.md`.

A second benchmark, `aave-flashloan-fee-001`, came back `3/3` vs `3/3` — a ceiling. It changes
nothing below except to sharpen #1: the model reproduced Aave's famous Pool address perfectly
from memory while fabricating Aerodrome's. Address fabrication tracks **protocol obscurity**,
not table-vs-prose. #1 is still the right edit, still resting on a single observation.

A third, `uniswap-v4-hook-fee-001`, also came back `3/3` vs `3/3` — but found the worst defect
in the skill (#0 below) and killed the table-vs-prose conjecture that #1 rests on. Read #1's
caveat before acting on it.

Ordered by expected value.

## 0. Fix the hook's fee override flag — it silently no-ops

`SKILL.md:75` returns `fee | 0x800000` from `beforeSwap`. Per `v4-core/src/libraries/LPFeeLibrary.sol`:

```solidity
uint24 public constant DYNAMIC_FEE_FLAG  = 0x800000;  // marks a pool dynamic-fee at init
uint24 public constant OVERRIDE_FEE_FLAG = 0x400000;  // signals a per-swap override
function isOverride(uint24 self) internal pure returns (bool) { return self & OVERRIDE_FEE_FLAG != 0; }
```

`fee | 0x800000` fails `isOverride()`, so the PoolManager throws the returned fee away and keeps
charging the pool's stored fee. The hook compiles, deploys, and does nothing.

**Fix:** `fee | 0x400000`, ideally via a named `OVERRIDE_FEE_FLAG` constant, with a line noting
that `0x800000` is the *pool's* dynamic-fee marker set at initialization, not a per-swap signal.

Highest severity found. A stale number invites a sanity check; working-looking code that quietly
no-ops does not. All three `with_skill` runs happened to reject it and use `0x400000` — gpt-5.5
knows v4's flags better than the skill does — but a weaker model has nothing to override it with.

## 1. Move the Base addresses into the address table

> **Caveat, added after `uniswap-v4-hook-fee-001`:** the reasoning below is no longer supported.
> `no_skill` recalled *both* table addresses (Aave Pool, and the V4 PoolManager vanity address)
> perfectly from memory, so the table never got a chance to demonstrate anything. Placement and
> protocol-fame are perfectly confounded in this skill: every table address is a canonical
> mainnet contract the model already knows; the one comment address is an L2 protocol it doesn't.
> The edit is still probably right, and it is cheap and harmless. But it is **unproven**, and the
> only way to prove it is to make the edit and re-run `base-dex-swap-001 with_skill` as an A/B.

The Aerodrome Router and Factory appear only as trailing `//` comments inside a Solidity
snippet (`SKILL.md:179`, `:184`). The "Key Protocol Addresses (Verified Mar 2026)" table is
mainnet-only and has no Aerodrome row.

`with_skill` run 4 fabricated the router **twice, differently, with the skill open**: a wrong
40-char constant in the contract, and a 39-char non-address in its `NOTES.md`. Both share the
real address's first 30 chars. Runs 5 and 6 copied it exactly. It was the only blind
`with_skill` failure.

Hypothesis: **addresses in a table get copied; addresses in prose get regenerated from memory.**
Add Base rows:

| Aerodrome Router | Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` |
| Aerodrome Factory | Factory | `0x420DD381b31aEf6683db6B902084cB0FFECe40Da` |

Cheapest edit here, and the one most likely to move `with_skill` to 3/3.

## 2. Fix the merger claim

The skill states, in the present tense, that Aerodrome and Velodrome "merged into **Aero**
(November 2025, Dromos Labs)" and that "the unified DEX dominates both Base and Optimism."

Dromos announced the merger around January 2026, with a Q2/July 2026 launch window. As of
today it is not a shipped, dominant, unified DEX. A skill library whose purpose is beating
stale priors should not ship a stale prior written as settled history.

## 3. Drop or date-stamp the TVL figure

"~$500-600M TVL" for Aerodrome. DeFi Llama has it near $323M today. The skill already tells
the reader to check DeFi Llama for Ethereum TVL, then hardcodes a number for Base.

## 4. Demote the "don't default to Uniswap" headline

It reproduced in **1 of 3** `no_skill` runs. The other two named Aerodrome unprompted. This
model largely already knows Base's dominant DEX.

What it does not know is the address — all three `no_skill` runs failed that check, two by
fabricating one with a correct prefix. The address table is doing the work, not the headline.
Lead with the verified constants.

## 5. Document Aerodrome Slipstream

The skill covers only the v2-style `Route[]` router. It never mentions Slipstream, Aerodrome's
concentrated-liquidity fork, which uses `exactInputSingle` and is a defensible venue for
USDC/WETH depth. `no_skill` run 1 reached for it unprompted. An agent following this skill has
no way to know Slipstream exists or when to prefer it.

## 6. Fix the flash-loan import path

`SKILL.md:132` imports `FlashLoanSimpleReceiverBase` from
`@aave/v3-core/contracts/flashloan-v3/base/`. The real package path is
`@aave/core-v3/contracts/flashloan/base/`. Untested by any benchmark so far — noted while
reading. An agent copying this snippet gets a build error.

## Not a skill problem — eval problems

Recorded here so they are not mistaken for skill defects:

- `expect_2`/`expect_3`/`expect_4` of `base-dex-swap-001` encode Aerodrome's **v2 router
  specifically**. `no_skill` run 1 chose Slipstream, which is arguably correct, and scored 1/4.
  The task cannot distinguish "wrong DEX" from "right DEX, other router", so `no_skill 0/3`
  reads harsher than the model deserves.
- Nothing in that task checks the contract works. `approve`/`transferFrom`/real `amountOut`
  were left ungraded on purpose, so a passing run is not a working swap.
- One executor, three runs. `default-to-uniswap-on-l2` rests on a single observation.
