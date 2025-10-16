```text
running 12 tests from ./src/concepts/CostSplitting/CostSplittingConcept.test.ts
models the operational principle correctly ... ok (880ms)
prevents creating expense with non-positive cost ... ok (477ms)
prevents creating expense for item that already exists ... ok (545ms)
fails to remove a non-existing expense ... ok (514ms)
marks item covered when total meets/exceeds cost ... ok (764ms)
merges same user's contributions ... ok (680ms)
updates existing contribution correctly ... ok (803ms)
prevents updating to negative amount ... ok (590ms)
prevents updating non-contributor ... ok (639ms)
prevents adding contribution that exceeds remaining cost ... ok (640ms)
prevents updating contribution that exceeds total cost ... ok (705ms)
CostSplitting: updateCost - lower cost when already fully covered (over-contribution scenario) ... ok (717ms)

ok | 12 passed | 0 failed (7s)
```
