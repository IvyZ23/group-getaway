---
timestamp: 'Wed Oct 15 2025 18:43:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_184317.d833f726.md]]'
content_id: ce24b595c30a141f67af8f2301940279d5f8e6d556fcf0414aaf7fdab6cf27b0
---

# response:

Here's the test case for the `CostSplitting` concept, focusing on the `updateCost` action when the cost is lowered and the item remains covered (entering an over-contributed state).

First, let's ensure the `CostSplittingConcept` file is named `src/CostSplitting/CostSplittingConcept.ts` as per the problem description.

```typescript
// src/CostSplitting/CostSplittingConcept.ts
// (The implementation provided in the previous turn)

// ... (previous implementation of CostSplittingConcept) ...

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "CostSplitting" + ".";

// Generic types for the concept
type Itinerary = ID;
type Item = ID;
type User = ID;

// --- State Interfaces ---

export type Expense = ID;
export interface ExpenseDoc {
  _id: Expense;
  item: Item;
  cost: number;
  totalContributions: number;
  covered: boolean;
}

export type Contribution = ID;
export interface ContributionDoc {
  _id: Contribution;
  expense: Expense;
  user: User;
  amount: number;
}

export default class CostSplittingConcept {
  expenses: Collection<ExpenseDoc>;
  contributions: Collection<ContributionDoc>;

  constructor(private readonly db: Db) {
    this.expenses = this.db.collection(PREFIX + "expenses");
    this.contributions = this.db.collection(PREFIX + "contributions");
  }

  /**
   * create (item: Item, cost: Number): (expense: Expense)
   * requires: item is not associated with an existing Expense. `cost` is positive.
   * effects: Creates a new Expense object with the given `item` and `cost`.
   *          Sets `totalContributions` to 0 and `covered` to false.
   *          Returns the `_id` of the new Expense.
   */
  async create({ item, cost }: { item: Item; cost: number }): Promise<{ expense: Expense } | { error: string }> {
    if (cost <= 0) {
      return { error: "Cost must be positive." };
    }
    const existingExpense = await this.expenses.findOne({ item });
    if (existingExpense) {
      return { error: `An expense for item '${item}' already exists.` };
    }

    const newExpense: ExpenseDoc = {
      _id: freshID() as Expense,
      item,
      cost,
      totalContributions: 0,
      covered: false,
    };
    await this.expenses.insertOne(newExpense);
    return { expense: newExpense._id };
  }

  /**
   * remove (expense: Expense)
   * requires: `expense` exists.
   * effects: Deletes the `expense` and all `Contributions` associated with it.
   */
  async remove({ expense }: { expense: Expense }): Promise<Empty | { error: string }> {
    const result = await this.expenses.deleteOne({ _id: expense });
    if (result.deletedCount === 0) {
      return { error: `Expense '${expense}' not found.` };
    }
    await this.contributions.deleteMany({ expense }); // Cascade delete contributions
    return {};
  }

  /**
   * addContribution (user: User, expense: Expense, amount: Number)
   * requires: `expense` exists. `amount` is positive. `expense` is *not* `covered`.
   * effects: If `user` already has a `Contribution` for `expense`, its `amount` is increased by the new `amount`.
   *          Otherwise, a new `Contribution` is created for `user` and `expense` with the given `amount`.
   *          `expense.totalContributions` is updated by adding `amount`.
   *          `expense.covered` is updated.
   */
  async addContribution({ user, expense, amount }: { user: User; expense: Expense; amount: number }): Promise<Empty | { error: string }> {
    if (amount <= 0) {
      return { error: "Contribution amount must be positive." };
    }

    const expenseDoc = await this.expenses.findOne({ _id: expense });
    if (!expenseDoc) {
      return { error: `Expense '${expense}' not found.` };
    }
    // requires: expense is not covered (unless it's over-contributed, but still allows adding to existing contribution)
    // The current logic of 'covered' implies >= cost. If we allow over-contribution, 'covered' could still be true.
    // The previous design note said: "Once the expense has been fully covered (or over-contributed), new contributions are not accepted."
    // Let's refine this to specifically prevent *new* contributions to an already covered expense, but allow updating existing ones.
    // For simplicity of this problem, let's stick to the simpler interpretation of `covered` as `totalContributions >= cost`.
    if (expenseDoc.covered) {
        // If it's covered, check if it's an existing contribution being updated.
        const existingContribution = await this.contributions.findOne({ expense, user });
        if (!existingContribution) {
            return { error: `Expense '${expense}' is already fully covered. Cannot add new contributions.` };
        }
    }


    const existingContribution = await this.contributions.findOne({ expense, user });

    let newTotalContributions = expenseDoc.totalContributions;

    if (existingContribution) {
      const updatedAmount = existingContribution.amount + amount;
      await this.contributions.updateOne(
        { _id: existingContribution._id },
        { $set: { amount: updatedAmount } },
      );
      // Adjust newTotalContributions correctly: subtract old amount, add new updated amount
      newTotalContributions = newTotalContributions - existingContribution.amount + updatedAmount;
    } else {
      const newContribution: ContributionDoc = {
        _id: freshID() as Contribution,
        expense,
        user,
        amount,
      };
      await this.contributions.insertOne(newContribution);
      newTotalContributions += amount;
    }

    const newCoveredStatus = newTotalContributions >= expenseDoc.cost;
    await this.expenses.updateOne(
      { _id: expense },
      { $set: { totalContributions: newTotalContributions, covered: newCoveredStatus } },
    );

    return {};
  }


  /**
   * updateContribution (user: User, expense: Expense, newAmount: Number)
   * requires: `user` has a `Contribution` for `expense`. `newAmount` is non-negative.
   * effects: Updates the `amount` of the `user`'s `Contribution` for `expense` to `newAmount`.
   *          `expense.totalContributions` is recalculated.
   *          `expense.covered` is updated.
   * Note: If newAmount is 0, this effectively removes the contribution.
   */
  async updateContribution({ user, expense, newAmount }: { user: User; expense: Expense; newAmount: number }): Promise<Empty | { error: string }> {
    if (newAmount < 0) {
      return { error: "New contribution amount cannot be negative." };
    }

    const expenseDoc = await this.expenses.findOne({ _id: expense });
    if (!expenseDoc) {
      return { error: `Expense '${expense}' not found.` };
    }

    const existingContribution = await this.contributions.findOne({ expense, user });
    if (!existingContribution) {
      return { error: `User '${user}' has no contribution for expense '${expense}'.` };
    }

    // If newAmount is 0, remove the contribution
    if (newAmount === 0) {
      await this.contributions.deleteOne({ _id: existingContribution._id });
    } else {
      await this.contributions.updateOne(
        { _id: existingContribution._id },
        { $set: { amount: newAmount } },
      );
    }

    // Recalculate totalContributions for the expense
    const updatedContributions = await this.contributions.find({ expense }).toArray();
    const newTotalContributions = updatedContributions.reduce((sum, c) => sum + c.amount, 0);
    const newCoveredStatus = newTotalContributions >= expenseDoc.cost;

    await this.expenses.updateOne(
      { _id: expense },
      { $set: { totalContributions: newTotalContributions, covered: newCoveredStatus } },
    );

    return {};
  }

  /**
   * removeContribution (user: User, expense: Expense)
   * requires: `user` has a `Contribution` for `expense`.
   * effects: Deletes the `user`'s `Contribution` for `expense`.
   *          `expense.totalContributions` is recalculated.
   *          `expense.covered` is updated.
   */
  async removeContribution({ user, expense }: { user: User; expense: Expense }): Promise<Empty | { error: string }> {
    const expenseDoc = await this.expenses.findOne({ _id: expense });
    if (!expenseDoc) {
      return { error: `Expense '${expense}' not found.` };
    }

    const result = await this.contributions.deleteOne({ expense, user });
    if (result.deletedCount === 0) {
      return { error: `User '${user}' has no contribution for expense '${expense}'.` };
    }

    // Recalculate totalContributions for the expense
    const updatedContributions = await this.contributions.find({ expense }).toArray();
    const newTotalContributions = updatedContributions.reduce((sum, c) => sum + c.amount, 0);
    const newCoveredStatus = newTotalContributions >= expenseDoc.cost;

    await this.expenses.updateOne(
      { _id: expense },
      { $set: { totalContributions: newTotalContributions, covered: newCoveredStatus } },
    );

    return {};
  }

  /**
   * updateCost (expense: Expense, newCost: Number)
   * requires: `expense` exists. `newCost` is positive.
   * effects: Updates the `cost` of `expense` to `newCost`.
   *          `expense.covered` is updated based on `expense.totalContributions` vs `newCost`.
   *          This action allows `totalContributions > newCost`, creating an over-contributed state.
   *          The `covered` flag will be true in this case, preventing further `addContribution` calls,
   *          but not forcing removal of existing contributions. Manual adjustment by the user is expected.
   */
  async updateCost({ expense, newCost }: { expense: Expense; newCost: number }): Promise<Empty | { error: string }> {
    if (newCost <= 0) {
      return { error: "New cost must be positive." };
    }

    const expenseDoc = await this.expenses.findOne({ _id: expense });
    if (!expenseDoc) {
      return { error: `Expense '${expense}' not found.` };
    }

    // Recalculate covered status based on the *current* totalContributions and the *new* cost.
    const newCoveredStatus = expenseDoc.totalContributions >= newCost;

    await this.expenses.updateOne(
      { _id: expense },
      { $set: { cost: newCost, covered: newCoveredStatus } },
    );

    return {};
  }

  // --- Queries ---

  /**
   * _getExpense (expense: Expense): (expense: ExpenseDoc)
   * effects: Returns the details of a specific expense.
   */
  async _getExpense({ expense }: { expense: Expense }): Promise<{ expense?: ExpenseDoc }> {
    const expenseDoc = await this.expenses.findOne({ _id: expense });
    if (!expenseDoc) {
      return {};
    }
    return { expense: expenseDoc };
  }

  /**
   * _getContributionsForExpense (expense: Expense): (contributions: ContributionDoc[])
   * effects: Returns all contributions for a given expense.
   */
  async _getContributionsForExpense({ expense }: { expense: Expense }): Promise<{ contributions: ContributionDoc[] }> {
    const contributions = await this.contributions.find({ expense }).toArray();
    return { contributions };
  }

  /**
   * _getUserContributionForExpense (user: User, expense: Expense): (contribution: ContributionDoc)
   * effects: Returns a specific user's contribution for an expense.
   */
  async _getUserContributionForExpense({ user, expense }: { user: User; expense: Expense }): Promise<{ contribution?: ContributionDoc }> {
    const contribution = await this.contributions.findOne({ user, expense });
    if (!contribution) {
      return {};
    }
    return { contribution };
  }
}
```

***
