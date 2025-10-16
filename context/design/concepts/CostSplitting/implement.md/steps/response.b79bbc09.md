---
timestamp: 'Wed Oct 15 2025 15:25:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_152534.cc4069ba.md]]'
content_id: b79bbc09afd6e4f0f858ba33f81070439adf0b701aab34348ac666ea548e30fc
---

# response:

Here's the TypeScript implementation for the `CostSplitting` concept, following the provided guidelines for concept design and MongoDB integration.

```typescript
// file: src/CostSplitting/CostSplittingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Assuming utils are two directories up
import { freshID } from "../../utils/database.ts"; // Assuming utils are two directories up

/**
 * @concept CostSplitting [Itinerary, Item]
 * @purpose allow for easier planning on how an expense would be paid for
 * @principle An expense is created. Users can add themselves as
 * a contributor and cover a certain amount of the expense. Once the expense
 * has been fully covered, users can no longer contribute.
 */
const PREFIX = "CostSplitting" + ".";

// Generic types for this concept, as defined in the concept header.
// They are treated polymorphically and are essentially unique identifiers (IDs).
type Itinerary = ID; // Defined as per concept header, though not directly used in the provided actions/state.
type Item = ID;     // The item being split (e.g., "dinner", "flight ticket")
type User = ID;     // The user contributing to an expense

/**
 * Represents an individual contribution to an expense.
 * Embedded within the Expense document.
 *
 * @state a set of Contributors
 * @property userId User
 * @property amount Number
 */
interface Contributor {
  userId: User;
  amount: number;
}

/**
 * Represents an expense that can be split among contributors.
 * This corresponds to "a set of Expenses" in the concept state.
 *
 * @state a set of Expenses with
 * @property _id ID (Unique identifier for the expense)
 * @property item Item (The generic item associated with this expense)
 * @property cost Number (The total cost of the expense)
 * @property contributors a set of Contributors (Embedded array of user contributions)
 * @property covered Flag (Boolean indicating if the total contributions meet or exceed the cost)
 */
interface ExpenseDocument {
  _id: ID;
  item: Item;
  cost: number;
  contributors: Contributor[];
  covered: boolean; // True if sum of contributions >= cost
}

export default class CostSplittingConcept {
  private expenses: Collection<ExpenseDocument>;

  constructor(private readonly db: Db) {
    this.expenses = this.db.collection(PREFIX + "expenses");
  }

  /**
   * create(item: Item, cost: Number): { expenseId: ID } | { error: string }
   *
   * @requires item to not already be added as an expense; cost must be positive.
   * @effects Creates a new expense document in the database with the given item and cost.
   *          Initializes with an empty list of contributors and 'covered' set to false.
   */
  async create({ item, cost }: { item: Item; cost: number }): Promise<{ expenseId: ID } | { error: string }> {
    if (cost <= 0) {
      return { error: "Expense cost must be positive." };
    }

    // Check if an expense for this item already exists to enforce uniqueness (as per 'requires')
    // The concept specifies "item to not already be added as an expense". This implies item is a unique identifier for an expense.
    const existingExpense = await this.expenses.findOne({ item });
    if (existingExpense) {
      return { error: `An expense for item '${item}' already exists.` };
    }

    const newExpense: ExpenseDocument = {
      _id: freshID(),
      item,
      cost,
      contributors: [], // Initially no contributors
      covered: false, // Initially not covered
    };

    try {
      await this.expenses.insertOne(newExpense);
      return { expenseId: newExpense._id };
    } catch (e) {
      console.error(`CostSplittingConcept: Error creating expense for item '${item}':`, e);
      return { error: "Failed to create expense due to an internal error." };
    }
  }

  /**
   * remove(expense: Expense): Empty | { error: string }
   *
   * @requires expense to exist.
   * @effects Deletes the expense document and all associated contributions (since they are embedded).
   */
  async remove({ expenseId }: { expenseId: ID }): Promise<Empty | { error: string }> {
    const result = await this.expenses.deleteOne({ _id: expenseId });
    if (result.deletedCount === 0) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    return {};
  }

  /**
   * addContribution(user: User, expense: Expense, amount: Number): Empty | { error: string }
   *
   * @requires Expense to exist and not be fully covered. Amount must be positive.
   *           The new contribution amount (or merged amount if user exists) must not exceed the remaining cost.
   * @effects If user already exists as a contributor for this expense, merges the amounts.
   *          Else, adds user as a new contributor. Updates 'covered' flag if total contributions reach or exceed cost.
   */
  async addContribution({
    userId,
    expenseId,
    amount,
  }: {
    userId: User;
    expenseId: ID;
    amount: number;
  }): Promise<Empty | { error: string }> {
    if (amount <= 0) {
      return { error: "Contribution amount must be positive." };
    }

    const expense = await this.expenses.findOne({ _id: expenseId });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    // Principle: "Once the expense has been fully covered, users can no longer contribute."
    if (expense.covered) {
      return { error: `Expense '${expenseId}' is already fully covered. No more contributions can be added.` };
    }

    const existingContributor = expense.contributors.find((c) => c.userId === userId);
    let newAmountForUser: number; // The amount this user *will have* after this operation

    if (existingContributor) {
      newAmountForUser = existingContributor.amount + amount;
    } else {
      newAmountForUser = amount;
    }

    // Calculate the total contributions *if this operation succeeds*
    // Sum all other contributors, then add the new (or updated) amount for the current user.
    const totalContributionsExcludingCurrentUser = expense.contributors
      .filter((c) => c.userId !== userId)
      .reduce((sum, c) => sum + c.amount, 0);

    const prospectiveTotalContributions = totalContributionsExcludingCurrentUser + newAmountForUser;

    // Check if this new total would exceed the expense cost
    if (prospectiveTotalContributions > expense.cost) {
      // Provide a helpful error message indicating how much more can be contributed
      const remainingNeeded = expense.cost - totalContributionsExcludingCurrentUser - (existingContributor?.amount || 0);
      return {
        error: `Contribution of '${amount}' from user '${userId}' would cause total contributions ` +
               `('${prospectiveTotalContributions}') to exceed the expense cost ('${expense.cost}'). ` +
               `You can only contribute up to '${Math.max(0, remainingNeeded)}' more.`,
      };
    }

    // Update the contributors array in memory
    let updatedContributors: Contributor[];
    if (existingContributor) {
      // User already a contributor, update their amount
      updatedContributors = expense.contributors.map((c) =>
        c.userId === userId ? { ...c, amount: newAmountForUser } : c
      );
    } else {
      // Add new contributor
      updatedContributors = [...expense.contributors, { userId, amount: newAmountForUser }];
    }

    // Determine new 'covered' status
    const newCoveredStatus = prospectiveTotalContributions >= expense.cost;

    // Perform atomic update of both contributors array and covered flag
    const updateResult = await this.expenses.updateOne(
      { _id: expenseId },
      {
        $set: {
          contributors: updatedContributors,
          covered: newCoveredStatus,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // This might indicate a concurrent modification or deletion of the expense.
      return { error: "Failed to update expense contributors. Expense might have been modified concurrently." };
    }

    return {};
  }

  /**
   * updateContribution(user: User, newAmount: Number, expense: Expense): Empty | { error: string }
   *
   * @requires User to exist as a contributor for expense; newAmount must be non-negative.
   *           The total contributions (after this update, considering other contributors) must not exceed the expense cost.
   * @effects Updates user's contribution amount for the specified expense.
   *          Updates 'covered' flag if total contributions change status.
   */
  async updateContribution({
    userId,
    newAmount,
    expenseId,
  }: {
    userId: User;
    newAmount: number;
    expenseId: ID;
  }): Promise<Empty | { error: string }> {
    if (newAmount < 0) {
      return { error: "New contribution amount cannot be negative." };
    }

    const expense = await this.expenses.findOne({ _id: expenseId });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }

    const existingContributor = expense.contributors.find((c) => c.userId === userId);
    if (!existingContributor) {
      return { error: `User '${userId}' is not a contributor for expense '${expenseId}'.` };
    }

    // Calculate the total contributions *if this operation succeeds*
    // Sum all other contributors, then add the new amount for the current user.
    const totalContributionsExcludingCurrentUser = expense.contributors
      .filter((c) => c.userId !== userId)
      .reduce((sum, c) => sum + c.amount, 0);

    const prospectiveTotalContributions = totalContributionsExcludingCurrentUser + newAmount;

    // Check against the expense cost to ensure we don't exceed it.
    if (prospectiveTotalContributions > expense.cost) {
      return {
        error: `New contribution amount '${newAmount}' for user '${userId}' would cause total contributions ` +
               `('${prospectiveTotalContributions}') to exceed the expense cost ('${expense.cost}').`,
      };
    }
    
    // Principle: "Once the expense has been fully covered, users can no longer contribute."
    // This action allows modification of existing contributions. If a user *reduces* their contribution
    // causing the expense to become uncovered, that's allowed. However, if the expense is already
    // covered, a contribution cannot be *increased* if it would keep it covered, but block new contributions.
    // The previous check `prospectiveTotalContributions > expense.cost` already covers the "cannot exceed cost" part.
    // The "cannot contribute if covered" applies to *new* contributions that increase the total, not changes that reduce it or keep it within bounds.
    // If the expense is covered and the newAmount is greater than the old one, but still within the cost, it's allowed.
    // If expense.covered is true, and prospectiveTotalContributions is still >= expense.cost, it's allowed.
    // The explicit 'covered' check from addContribution is not strictly necessary here because we check against `expense.cost` directly.

    // Update the contributors array in memory
    const updatedContributors: Contributor[] = expense.contributors.map((c) =>
      c.userId === userId ? { ...c, amount: newAmount } : c
    );

    // Determine new 'covered' status
    const newCoveredStatus = prospectiveTotalContributions >= expense.cost;

    // Perform atomic update of both contributors array and covered flag
    const updateResult = await this.expenses.updateOne(
      { _id: expenseId },
      {
        $set: {
          contributors: updatedContributors,
          covered: newCoveredStatus,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if 'existingContributor' was found and expense exists,
      // but provides safety against concurrent modifications.
      return { error: "Failed to update contribution. Expense or contributor not found or concurrently modified." };
    }

    return {};
  }

  // --- Queries ---

  /**
   * _getExpense({ expenseId: ID }): Promise<ExpenseDocument | null>
   * Retrieves an expense document by its unique identifier.
   */
  async _getExpense({ expenseId }: { expenseId: ID }): Promise<ExpenseDocument | null> {
    return this.expenses.findOne({ _id: expenseId });
  }

  /**
   * _getExpensesByItem({ item: Item }): Promise<ExpenseDocument[]>
   * Retrieves all expense documents associated with a particular item ID.
   * Note: The 'create' action implies 'item' is unique per expense.
   * This query would typically return at most one result, but is typed for consistency with a general 'find' operation.
   */
  async _getExpensesByItem({ item }: { item: Item }): Promise<ExpenseDocument[]> {
    return this.expenses.find({ item }).toArray();
  }

  /**
   * _getTotalContributions({ expenseId: ID }): Promise<{ total: number } | { error: string }>
   * Calculates the current total amount contributed to a specific expense.
   */
  async _getTotalContributions({ expenseId }: { expenseId: ID }): Promise<{ total: number } | { error: string }> {
    // Project only the contributors field to minimize data transfer
    const expense = await this.expenses.findOne({ _id: expenseId }, { projection: { contributors: 1 } });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    const total = expense.contributors.reduce((sum, c) => sum + c.amount, 0);
    return { total };
  }

  /**
   * _getUserContribution({ userId: User, expenseId: ID }): Promise<{ amount: number } | { error: string }>
   * Retrieves a specific user's contribution amount for a given expense.
   */
  async _getUserContribution({
    userId,
    expenseId,
  }: {
    userId: User;
    expenseId: ID;
  }): Promise<{ amount: number } | { error: string }> {
    // Use array projection to fetch only the matching contributor within the expense document
    const expense = await this.expenses.findOne(
      { _id: expenseId, "contributors.userId": userId },
      { projection: { "contributors.$": 1 } }, // Projects only the matching element from the contributors array
    );

    if (!expense || !expense.contributors || expense.contributors.length === 0) {
      return { error: `User '${userId}' is not a contributor for expense '${expenseId}'.` };
    }
    return { amount: expense.contributors[0].amount };
  }

  /**
   * _getExpenseCoveredStatus({ expenseId: ID }): Promise<{ covered: boolean } | { error: string }>
   * Retrieves the current covered status of an expense.
   */
  async _getExpenseCoveredStatus({ expenseId }: { expenseId: ID }): Promise<{ covered: boolean } | { error: string }> {
    // Project only the covered field
    const expense = await this.expenses.findOne({ _id: expenseId }, { projection: { covered: 1 } });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    return { covered: expense.covered };
  }
}
```
