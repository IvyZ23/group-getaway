---
timestamp: 'Mon Oct 13 2025 01:43:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_014333.cbd2d20d.md]]'
content_id: 8dac12188bb70d35b6508a51c4ef73c1a3d5c5560a2bef4dec26cef65ee10e44
---

# concept: CostSplitting

**concept** CostSplitting \[User, Item]

**purpose** To enable a group of users to equitably share the cost of an item or service, and track payments between them.

**principle** If User A records a purchase of an item (e.g., a restaurant bill) for a group including User B and User C, then User B and User C will each owe User A their calculated share. When User B pays User A their share, User A can mark that specific debt as paid, reflecting the reduction in outstanding balances.

**state**
  `a set of Purchases with`
    `_id: Item` (the unique identifier for the purchased item/service)
    `purchaser: User` (the user who initially paid for the item)
    `totalCost: Number` (the total monetary cost of the item)
    `participants: set of User` (the users who are splitting the cost, including the purchaser)
    `status: String` (e.g., "active", "cancelled")

  `a set of Debts with`
    `_id: ID` (a unique identifier for this specific debt entry)
    `item: Item` (the item this debt is associated with)
    `payer: User` (the user who owes money)
    `payee: User` (the user who is owed money)
    `amount: Number` (the specific amount owed for this debt)
    `isPaid: Boolean` (whether this specific debt has been settled)

**actions**

  `recordPurchase (item: Item, purchaser: User, totalCost: Number, participants: set of User): Empty | (error: String)`
    **requires** `item` is not already recorded; `purchaser` is included in `participants`; `totalCost` is non-negative; `participants` set is not empty.
    **effects** Creates a `Purchase` record. For each participant (excluding the `purchaser`), creates a `Debt` record linking them to the `purchaser` for their calculated share (`totalCost` / `numParticipants`). If the `purchaser` is the only `participant`, no `Debt` records are created.

  `markAsPaid (debtId: ID): Empty | (error: String)`
    **requires** A `Debt` with `debtId` exists and its `isPaid` status is `false`.
    **effects** Sets the `isPaid` field to `true` for the specified debt.

  `cancelPurchase (item: Item): Empty | (error: String)`
    **requires** A `Purchase` with `item` exists and its `status` is "active". All associated `Debts` must be unpaid.
    **effects** Sets the `Purchase`'s `status` to "cancelled". Deletes all associated `Debt` records.

**queries**

  `_getPurchaseDetails (item: Item): (purchase: PurchaseRecord) | (error: String)`
    **effects** Returns the details of a specific purchase.

  `_getDebtsForItem (item: Item): (debts: set of DebtRecord)`
    **effects** Returns all debt records associated with a specific item.

  `_getDebtsOwedToUser (user: User): (debts: set of DebtRecord)`
    **effects** Returns all unpaid debt records where `payee` is the given `user`.

  `_getDebtsOwedByUser (user: User): (debts: set of DebtRecord)`
    **effects** Returns all unpaid debt records where `payer` is the given `user`.

  `_getUserBalance (user: User): (balance: Number)`
    **effects** Calculates the net balance for the user (total owed to them - total they owe), considering only unpaid debts.

***
