---
timestamp: 'Wed Oct 15 2025 18:43:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_184317.d833f726.md]]'
content_id: 3825eb7f2b6891db8688525cf3aa3372c90450c83e45e9ebc85410436a4b8322
---

# trace: CostSplitting updateCost (Lower Cost)

This trace demonstrates the principle of allowing over-contribution when the cost is lowered.

1. **create({ item: "item:Lunch", cost: 100 })**
   * **Requires:** "item:Lunch" not associated with an existing expense, cost > 0. (Satisfied)
   * **Effects:** A new `Expense` (e.g., `expense:1`) is created:
     * `_id`: `expense:1`
     * `item`: `"item:Lunch"`
     * `cost`: `100`
     * `totalContributions`: `0`
     * `covered`: `false`
   * **Result:** `{ expense: "expense:1" }`

2. **addContribution({ user: "user:Alice", expense: "expense:1", amount: 60 })**
   * **Requires:** `expense:1` exists, amount > 0, `expense:1` is not `covered`. (Satisfied, `totalContributions` is 0 < 100)
   * **Effects:**
     * A new `Contribution` is created for `"user:Alice"` for `expense:1` with `amount: 60`.
     * `expense:1.totalContributions` is updated to `0 + 60 = 60`.
     * `expense:1.covered` is updated to `false` (60 < 100).
   * **Result:** `{}`

3. **addContribution({ user: "user:Bob", expense: "expense:1", amount: 40 })**
   * **Requires:** `expense:1` exists, amount > 0, `expense:1` is not `covered`. (Satisfied, `totalContributions` is 60 < 100)
   * **Effects:**
     * A new `Contribution` is created for `"user:Bob"` for `expense:1` with `amount: 40`.
     * `expense:1.totalContributions` is updated to `60 + 40 = 100`.
     * `expense:1.covered` is updated to `true` (100 >= 100).
   * **Result:** `{}`
   * **Current State of `expense:1`:** `cost: 100`, `totalContributions: 100`, `covered: true`.

4. **updateCost({ expense: "expense:1", newCost: 80 })**
   * **Requires:** `expense:1` exists, `newCost` > 0. (Satisfied)
   * **Effects:**
     * `expense:1.cost` is updated to `80`.
     * `expense:1.covered` is re-evaluated: `expense:1.totalContributions` (which is `100`) is still `>= newCost` (`80`), so `expense:1.covered` remains `true`.
     * **Crucially, no `Contribution` records are altered or deleted.**
   * **Result:** `{}`
   * **Final State of `expense:1`:** `cost: 80`, `totalContributions: 100`, `covered: true`. (This is an "over-contributed" state, where `totalContributions > cost`, but `covered` is still true to reflect that enough has been collected.)
