---
timestamp: 'Mon Oct 13 2025 01:43:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_014333.cbd2d20d.md]]'
content_id: e6c084bf972ecd7cb97f5ea8b61d7207e1d26702785312c5f32c6dc359361d16
---

# file: src/CostSplitting/CostSplittingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as necessary for your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as necessary for your project structure

// Declare collection prefix, use concept name
const PREFIX = "CostSplitting" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;

/**
 * @concept CostSplitting [User, Item]
 * @purpose To enable a group of users to equitably share the cost of an item or service, and track payments between them.
 * @principle If User A records a purchase of an item (e.g., a restaurant bill) for a group including User B and User C,
 *            then User B and User C will each owe User A their calculated share.
 *            When User B pays User A their share, User A can mark that specific debt as paid,
 *            reflecting the reduction in outstanding balances.
 */

/**
 * State: a set of Purchases
 * _id: Item (the unique identifier for the purchased item/service)
 * purchaser: User (the user who initially paid for the item)
 * totalCost: Number (the total monetary cost of the item)
 * participants: set of User (the users who are splitting the cost, including the purchaser)
 * status: String (e.g., "active", "cancelled")
 */
interface PurchaseRecord {
  _id: Item;
  purchaser: User;
  totalCost: number;
  participants: User[];
  status: "active" | "cancelled";
}

/**
 * State: a set of Debts
 * _id: ID (a unique identifier for this specific debt entry)
 * item: Item (the item this debt is associated with)
 * payer: User (the user who owes money)
 * payee: User (the user who is owed money)
 * amount: Number (the specific amount owed for this debt)
 * isPaid: Boolean (whether this specific debt has been settled)
 */
interface DebtRecord {
  _id: ID;
  item: Item;
  payer: User;
  payee: User;
  amount: number;
  isPaid: boolean;
}

export default class CostSplittingConcept {
  private purchases: Collection<PurchaseRecord>;
  private debts: Collection<DebtRecord>;

  constructor(private readonly db: Db) {
    this.purchases = this.db.collection(PREFIX + "purchases");
    this.debts = this.db.collection(PREFIX + "debts");
  }

  /**
   * @action recordPurchase (item: Item, purchaser: User, totalCost: Number, participants: set of User): Empty | (error: String)
   * @requires item is not already recorded; purchaser is included in participants; totalCost is non-negative; participants set is not empty.
   * @effects Creates a Purchase record. For each participant (excluding the purchaser),
   *          creates a Debt record linking them to the purchaser for their calculated share (totalCost / numParticipants).
   *          If the purchaser is the only participant, no Debt records are created.
   */
  async recordPurchase(
    { item, purchaser, totalCost, participants }: {
      item: Item;
      purchaser: User;
      totalCost: number;
      participants: User[];
    },
  ): Promise<Empty | { error: string }> {
    // Requires: item is not already recorded
    if (await this.purchases.findOne({ _id: item })) {
      return { error: "Purchase with this item ID already exists." };
    }

    // Requires: purchaser is included in participants
    if (!participants.includes(purchaser)) {
      return { error: "Purchaser must be included in the participants list." };
    }

    // Requires: totalCost is non-negative
    if (totalCost < 0) {
      return { error: "Total cost must be non-negative." };
    }

    // Requires: participants set is not empty
    if (participants.length === 0) {
      return { error: "Participants list cannot be empty." };
    }

    // Effects: Create Purchase record
    const purchase: PurchaseRecord = {
      _id: item,
      purchaser,
      totalCost,
      participants,
      status: "active",
    };
    await this.purchases.insertOne(purchase);

    // Effects: Create Debt records for each participant (excluding the purchaser)
    const numSplits = participants.length;
    if (numSplits > 1) { // If there's more than just the purchaser
      const share = totalCost / numSplits;
      const debtOperations = participants
        .filter((p) => p !== purchaser)
        .map((payer) => {
          // Generate a fresh ID for each debt entry
          return {
            _id: freshID(),
            item,
            payer,
            payee: purchaser,
            amount: share,
            isPaid: false,
          };
        });
      if (debtOperations.length > 0) {
        await this.debts.insertMany(debtOperations);
      }
    }

    return {};
  }

  /**
   * @action markAsPaid (debtId: ID): Empty | (error: String)
   * @requires A Debt with debtId exists and its isPaid status is false.
   * @effects Sets the isPaid field to true for the specified debt.
   */
  async markAsPaid({ debtId }: { debtId: ID }): Promise<Empty | { error: string }> {
    const debt = await this.debts.findOne({ _id: debtId });

    // Requires: A Debt with debtId exists
    if (!debt) {
      return { error: `Debt with ID ${debtId} not found.` };
    }
    // Requires: isPaid status is false.
    if (debt.isPaid) {
      return { error: `Debt with ID ${debtId} is already marked as paid.` };
    }

    // Effects: Sets isPaid to true for the specified debt.
    await this.debts.updateOne(
      { _id: debtId },
      { $set: { isPaid: true } },
    );

    return {};
  }

  /**
   * @action cancelPurchase (item: Item): Empty | (error: String)
   * @requires A Purchase with item exists and its status is "active". All associated Debts must be unpaid.
   * @effects Sets the Purchase's status to "cancelled". Deletes all associated Debt records.
   */
  async cancelPurchase({ item }: { item: Item }): Promise<Empty | { error: string }> {
    const purchase = await this.purchases.findOne({ _id: item });

    // Requires: A Purchase with item exists and its status is "active".
    if (!purchase) {
      return { error: `Purchase with item ID ${item} not found.` };
    }
    if (purchase.status === "cancelled") {
      return { error: `Purchase with item ID ${item} is already cancelled.` };
    }

    // Requires: All associated Debts must be unpaid.
    const unpaidDebtsCount = await this.debts.countDocuments({ item: item, isPaid: false });
    if (unpaidDebtsCount > 0) {
      return { error: `Cannot cancel purchase ${item}: there are still ${unpaidDebtsCount} unpaid debts associated with it.` };
    }

    // Effects: Sets the Purchase status to "cancelled".
    await this.purchases.updateOne(
      { _id: item },
      { $set: { status: "cancelled" } },
    );

    // Effects: Deletes all associated Debt records.
    await this.debts.deleteMany({ item: item });

    return {};
  }

  /**
   * @query _getPurchaseDetails (item: Item): (purchase: PurchaseRecord) | (error: String)
   * @effects Returns the details of a specific purchase.
   */
  async _getPurchaseDetails(
    { item }: { item: Item },
  ): Promise<{ purchase?: PurchaseRecord; error?: string }> {
    const purchase = await this.purchases.findOne({ _id: item });
    if (!purchase) {
      return { error: `Purchase with item ID ${item} not found.` };
    }
    return { purchase };
  }

  /**
   * @query _getDebtsForItem (item: Item): (debts: set of DebtRecord)
   * @effects Returns all debt records associated with a specific item.
   */
  async _getDebtsForItem(
    { item }: { item: Item },
  ): Promise<{ debts: DebtRecord[] }> {
    const debts = await this.debts.find({ item: item }).toArray();
    return { debts };
  }

  /**
   * @query _getDebtsOwedToUser (user: User): (debts: set of DebtRecord)
   * @effects Returns all unpaid debt records where payee is the given user.
   */
  async _getDebtsOwedToUser(
    { user }: { user: User },
  ): Promise<{ debts: DebtRecord[] }> {
    const debts = await this.debts.find({ payee: user, isPaid: false }).toArray();
    return { debts };
  }

  /**
   * @query _getDebtsOwedByUser (user: User): (debts: set of DebtRecord)
   * @effects Returns all unpaid debt records where payer is the given user.
   */
  async _getDebtsOwedByUser(
    { user }: { user: User },
  ): Promise<{ debts: DebtRecord[] }> {
    const debts = await this.debts.find({ payer: user, isPaid: false }).toArray();
    return { debts };
  }

  /**
   * @query _getUserBalance (user: User): (balance: Number)
   * @effects Calculates the net balance for the user (total owed to them - total they owe), considering only unpaid debts.
   */
  async _getUserBalance({ user }: { user: User }): Promise<{ balance: number }> {
    const owedToMe = (await this.debts.find({ payee: user, isPaid: false }).toArray())
      .reduce((sum, debt) => sum + debt.amount, 0);
    const owedByMe = (await this.debts.find({ payer: user, isPaid: false }).toArray())
      .reduce((sum, debt) => sum + debt.amount, 0);

    return { balance: owedToMe - owedByMe };
  }
}
```
