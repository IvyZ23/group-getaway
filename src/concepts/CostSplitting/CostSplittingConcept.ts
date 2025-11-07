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
type Itinerary = ID; // Defined as per concept header, though not directly used in actions/state below.
type Item = ID; // The item being split (e.g., "dinner", "flight ticket")
type User = ID; // The user contributing to an expense

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
  async create(
    { item, cost }: { item: Item; cost: number },
  ): Promise<{ expenseId: ID } | { error: string }> {
    // Log the raw incoming payload to help diagnose cases where the frontend
    // may be sending unexpected values (e.g. empty string, formatted string,
    // or zero). This helps capture what the server actually received.
    try {
      // eslint-disable-next-line no-console
      console.log("CostSplitting.create called with raw payload", {
        item,
        cost,
        costType: typeof cost,
      });
    } catch (_e) {
      // ignore logging failures
    }
    // Coerce cost in case frontend sent a string (e.g. "1,234" or "123,")
    let parsedCost: number;
    if (typeof cost === "string") {
      const raw = (cost as unknown as string).trim();
      if (raw === "") {
        return { error: "Expense cost must be a positive number." };
      }
      const cleaned = raw.replace(/,/g, "");
      parsedCost = Number(cleaned);
    } else {
      parsedCost = cost as number;
    }

    if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
      return { error: "Expense cost must be a positive number." };
    }
    cost = parsedCost;

    // Check if an expense for this item already exists to enforce uniqueness (as per 'requires')
    const existingExpense = await this.expenses.findOne({ item });
    if (existingExpense) {
      // Return the existing expense id instead of an error to make create idempotent.
      try {
        // eslint-disable-next-line no-console
        console.debug(
          "CostSplitting.create: item already exists, returning existing expenseId",
          { item, expenseId: existingExpense._id },
        );
      } catch (_e) {
        // ignore logging failures
      }
      return { expenseId: existingExpense._id };
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
      console.error(
        `CostSplittingConcept: Error creating expense for item '${item}':`,
        e,
      );
      return { error: "Failed to create expense due to an internal error." };
    }
  }

  /**
   * remove(expenseId: Expense): Empty | { error: string }
   *
   * @requires expense to exist.
   * @effects Deletes the expense document and all associated contributions (since they are embedded).
   */
  async remove(
    { expenseId }: { expenseId: ID },
  ): Promise<Empty | { error: string }> {
    const result = await this.expenses.deleteOne({ _id: expenseId });
    if (result.deletedCount === 0) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    return {};
  }

  /**
   * updateCost (expenseId: ID, newCost: Number)
   *
   * @requires Expense exists and newCost > 0
   * @effects Updates the cost of the expense and recalculates the covered flag.
   */
  async updateCost({
    expenseId,
    newCost,
  }: {
    expenseId: ID;
    newCost: number;
  }): Promise<Empty | { error: string }> {
    // Coerce newCost from strings like "1,234" and validate
    let parsedNewCost: number;
    if (typeof newCost === "string") {
      const raw = (newCost as unknown as string).trim();
      if (raw === "") {
        return { error: "New cost must be a positive number." };
      }
      const cleaned = raw.replace(/,/g, "");
      parsedNewCost = Number(cleaned);
    } else {
      parsedNewCost = newCost as number;
    }
    if (!Number.isFinite(parsedNewCost) || parsedNewCost <= 0) {
      return { error: "New cost must be a positive number." };
    }
    newCost = parsedNewCost;

    const expenseDoc = await this.expenses.findOne({ _id: expenseId });
    if (!expenseDoc) {
      return { error: `Expense '${expenseId}' not found.` };
    }

    // Recalculate covered status based on *current* total contributions and the *new* cost
    const totalResult = await this._getTotalContributions({ expenseId });
    if ("error" in totalResult) {
      return totalResult;
    }

    const newCoveredStatus = totalResult.total >= newCost;

    await this.expenses.updateOne(
      { _id: expenseId },
      {
        $set: {
          cost: newCost,
          covered: newCoveredStatus,
        },
      },
    );

    return {};
  }

  /**
   * addContribution(userId: User, expenseId: Expense, amount: Number): Empty | { error: string }
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
    // Coerce amount in case frontend sent a formatted string
    let parsedAmount: number;
    if (typeof amount === "string") {
      const raw = (amount as unknown as string).trim();
      if (raw === "") {
        return { error: "Contribution amount must be a positive number." };
      }
      const cleaned = raw.replace(/,/g, "");
      parsedAmount = Number(cleaned);
    } else {
      parsedAmount = amount as number;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return { error: "Contribution amount must be a positive number." };
    }
    amount = parsedAmount;

    // Debug incoming contribution values
    try {
      // eslint-disable-next-line no-console
      console.log("CostSplitting.addContribution called", {
        userId,
        expenseId,
        amount,
      });
    } catch (_e) {
      // ignore logging failures
    }

    const expense = await this.expenses.findOne({ _id: expenseId });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    if (expense.covered) {
      return {
        error:
          `Expense '${expenseId}' is already fully covered. No more contributions can be added.`,
      };
    }

    const existingContributor = expense.contributors.find((c) =>
      c.userId === userId
    );
    let newTotalForUser;

    if (existingContributor) {
      newTotalForUser = existingContributor.amount + amount;
    } else {
      newTotalForUser = amount;
    }

    // Calculate total contributions, excluding the current user's *original* contribution,
    // then add the *prospective new total* for this user.
    const currentTotalContributionsExcludingUser = expense.contributors
      .filter((c) => c.userId !== userId)
      .reduce((sum, c) => sum + c.amount, 0);

    const prospectiveTotalContributions =
      currentTotalContributionsExcludingUser + newTotalForUser;

    if (prospectiveTotalContributions > expense.cost) {
      return {
        error:
          `Contribution amount '${amount}' would cause total contributions '${prospectiveTotalContributions}' to exceed the expense cost '${expense.cost}'.`,
      };
    }

    let updateResult;
    if (existingContributor) {
      // User already a contributor, update their amount
      updateResult = await this.expenses.updateOne(
        { _id: expenseId, "contributors.userId": userId },
        {
          $set: {
            "contributors.$.amount": newTotalForUser,
          },
        },
      );
    } else {
      // Add new contributor
      updateResult = await this.expenses.updateOne(
        { _id: expenseId },
        {
          $push: {
            contributors: { userId, amount: newTotalForUser }, // Push the new/merged amount
          },
        },
      );
    }

    if (updateResult.matchedCount === 0) {
      // This might indicate a concurrent modification or deletion of the expense.
      return {
        error:
          "Failed to update expense contributors. Expense might have been modified concurrently.",
      };
    }

    // After updating, re-evaluate and update 'covered' status if necessary
    const updatedExpense = await this.expenses.findOne({ _id: expenseId });
    if (updatedExpense) {
      const newTotalContributions = updatedExpense.contributors.reduce(
        (sum, c) => sum + c.amount,
        0,
      );
      const newCoveredStatus = newTotalContributions >= updatedExpense.cost;

      if (newCoveredStatus !== updatedExpense.covered) {
        await this.expenses.updateOne(
          { _id: expenseId },
          {
            $set: { covered: newCoveredStatus },
          },
        );
      }
    }

    return {};
  }

  /**
   * updateContribution(userId: User, newAmount: Number, expenseId: Expense): Empty | { error: string }
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
    // Coerce newAmount from string inputs and validate
    let parsedNewAmount: number;
    if (typeof newAmount === "string") {
      const raw = (newAmount as unknown as string).trim();
      if (raw === "") {
        return {
          error: "New contribution amount must be a non-negative number.",
        };
      }
      const cleaned = raw.replace(/,/g, "");
      parsedNewAmount = Number(cleaned);
    } else {
      parsedNewAmount = newAmount as number;
    }
    if (!Number.isFinite(parsedNewAmount) || parsedNewAmount < 0) {
      return {
        error: "New contribution amount must be a non-negative number.",
      };
    }
    newAmount = parsedNewAmount;

    const expense = await this.expenses.findOne({ _id: expenseId });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }

    const existingContributor = expense.contributors.find((c) =>
      c.userId === userId
    );
    if (!existingContributor) {
      return {
        error:
          `User '${userId}' is not a contributor for expense '${expenseId}'.`,
      };
    }

    // Calculate total contributions, excluding the current user's *original* contribution,
    // then add the *prospective new amount* for this user.
    const currentTotalContributionsExcludingUser = expense.contributors
      .filter((c) => c.userId !== userId)
      .reduce((sum, c) => sum + c.amount, 0);

    const prospectiveTotalContributions =
      currentTotalContributionsExcludingUser + newAmount;

    // Check against the expense cost to ensure we don't exceed it.
    if (prospectiveTotalContributions > expense.cost) {
      return {
        error:
          `New contribution amount '${newAmount}' for user '${userId}' would cause total contributions '${prospectiveTotalContributions}' to exceed the expense cost '${expense.cost}'.`,
      };
    }

    const updateResult = await this.expenses.updateOne(
      { _id: expenseId, "contributors.userId": userId },
      {
        $set: {
          "contributors.$.amount": newAmount,
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if 'existingContributor' was found and expense exists,
      // but provides safety against concurrent modifications.
      return {
        error:
          "Failed to update contribution. Expense or contributor not found or concurrently modified.",
      };
    }

    // After updating, re-evaluate and update 'covered' status if necessary
    const updatedExpense = await this.expenses.findOne({ _id: expenseId });
    if (updatedExpense) {
      const newTotalContributions = updatedExpense.contributors.reduce(
        (sum, c) => sum + c.amount,
        0,
      );
      const newCoveredStatus = newTotalContributions >= updatedExpense.cost;

      if (newCoveredStatus !== updatedExpense.covered) {
        await this.expenses.updateOne(
          { _id: expenseId },
          {
            $set: { covered: newCoveredStatus },
          },
        );
      }
    }

    return {};
  }

  // --- Queries ---

  /**
   * _getExpense({ expenseId: ID }): Promise<ExpenseDocument | null>
   * Retrieves an expense document by its unique identifier.
   */
  _getExpense(
    { expenseId }: { expenseId: ID },
  ): Promise<ExpenseDocument | null> {
    return this.expenses.findOne({ _id: expenseId });
  }

  /**
   * _getExpensesByItem({ item: Item }): Promise<ExpenseDocument[]>
   * Retrieves all expense documents associated with a particular item ID.
   */
  _getExpensesByItem(
    { item }: { item: Item },
  ): Promise<ExpenseDocument[]> {
    return this.expenses.find({ item }).toArray();
  }

  /**
   * _getTotalContributions({ expenseId: ID }): Promise<{ total: number } | { error: string }>
   * Calculates the current total amount contributed to a specific expense.
   */
  async _getTotalContributions(
    { expenseId }: { expenseId: ID },
  ): Promise<{ total: number } | { error: string }> {
    const expense = await this.expenses.findOne({ _id: expenseId });
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
    const expense = await this.expenses.findOne({ _id: expenseId });
    if (!expense) {
      return { error: `Expense with ID '${expenseId}' not found.` };
    }
    const contribution = expense.contributors.find((c) => c.userId === userId);
    if (!contribution) {
      return {
        error:
          `User '${userId}' is not a contributor for expense '${expenseId}'.`,
      };
    }
    return { amount: contribution.amount };
  }
}
