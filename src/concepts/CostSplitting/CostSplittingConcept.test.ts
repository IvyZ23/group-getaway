import { Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import { ID } from "../../utils/types.ts";
import CostSplittingConcept from "./CostSplittingConcept.ts";

// ===== Constants =====
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const USER_CHARLIE = "user:Charlie" as ID;
const ITEM_DINNER = "item:Dinner" as ID;
const ITEM_FLIGHT = "item:Flight" as ID;
const ITEM_HOTEL = "item:Hotel" as ID;

// ===== Helper to setup & teardown fresh DB each test =====
async function setupConcept() {
  const [db, client] = await testDb();
  const concept = new CostSplittingConcept(db);
  return { db, client, concept };
}

// ------------------------------------------------------------
// 1. Operational principle: creation, adding, merging, coverage
// ------------------------------------------------------------
Deno.test("models the operational principle correctly", async () => {
  const { concept, client } = await setupConcept();

  const createResult = await concept.create({ item: ITEM_DINNER, cost: 100 });
  const expenseId = (createResult as { expenseId: ID }).expenseId;
  assertExists(expenseId);

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 40 });
  let expense = await concept._getExpense({ expenseId });
  assertExists(expense);
  assertEquals(expense.contributors.length, 1);
  assertEquals(expense.covered, false);

  await concept.addContribution({ userId: USER_BOB, expenseId, amount: 30 });
  expense = await concept._getExpense({ expenseId });
  assertExists(expense);
  assertEquals(expense.contributors.length, 2);
  assertEquals(expense.covered, false);

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 30 });
  expense = await concept._getExpense({ expenseId });
  assertExists(expense);
  assertEquals(expense.covered, true);

  const addResultCharlie = await concept.addContribution({
    userId: USER_CHARLIE,
    expenseId,
    amount: 10,
  });
  assertObjectMatch(addResultCharlie, {
    error:
      `Expense '${expenseId}' is already fully covered. No more contributions can be added.`,
  });

  await client.close();
});

// ------------------------------------------------------------
// 2. Creation validations
// ------------------------------------------------------------
Deno.test("prevents creating expense with non-positive cost", async () => {
  const { concept, client } = await setupConcept();

  const resultZero = await concept.create({
    item: "item:ZeroCost" as ID,
    cost: 0,
  });
  assertObjectMatch(resultZero, { error: "Expense cost must be positive." });

  const resultNegative = await concept.create({
    item: "item:NegativeCost" as ID,
    cost: -50,
  });
  assertObjectMatch(resultNegative, {
    error: "Expense cost must be positive.",
  });

  await client.close();
});

Deno.test("prevents creating expense for item that already exists", async () => {
  const { concept, client } = await setupConcept();

  await concept.create({ item: ITEM_FLIGHT, cost: 500 });
  const result = await concept.create({ item: ITEM_FLIGHT, cost: 600 });
  assertObjectMatch(result, {
    error: `Item '${ITEM_FLIGHT}' already exists as an expense.`,
  });

  await client.close();
});

// ------------------------------------------------------------
// 3. Removing
// ------------------------------------------------------------
Deno.test("fails to remove a non-existing expense", async () => {
  const { concept, client } = await setupConcept();

  const id = "expense:nonexistent" as ID;
  const result = await concept.remove({ expenseId: id });
  assertObjectMatch(result, { error: `Expense with ID '${id}' not found.` });

  await client.close();
});

// ------------------------------------------------------------
// 4. Coverage calculation
// ------------------------------------------------------------
Deno.test("marks item covered when total meets/exceeds cost", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: ITEM_HOTEL,
    cost: 200,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 100 });
  await concept.addContribution({ userId: USER_BOB, expenseId, amount: 99 });

  let expense = await concept._getExpense({ expenseId });
  assertExists(expense);
  assertEquals(expense.covered, false);

  await concept.addContribution({ userId: USER_CHARLIE, expenseId, amount: 1 });
  expense = await concept._getExpense({ expenseId });
  assertExists(expense);
  assertEquals(expense.covered, true);

  await client.close();
});

// ------------------------------------------------------------
// 5. Merging and updating
// ------------------------------------------------------------
Deno.test("merges same user's contributions", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Groceries" as ID,
    cost: 80,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 20 });
  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 30 });

  const alice = await concept._getUserContribution({
    userId: USER_ALICE,
    expenseId,
  });
  if ("amount" in alice) {
    assertEquals(alice?.amount, 50);
  }

  await client.close();
});

Deno.test("updates existing contribution correctly", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Utilities" as ID,
    cost: 120,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_BOB, expenseId, amount: 60 });
  await concept.updateContribution({
    userId: USER_BOB,
    expenseId,
    newAmount: 80,
  });

  const bob = await concept._getUserContribution({
    userId: USER_BOB,
    expenseId,
  });
  if ("amount" in bob) {
    assertEquals(bob?.amount, 80);
  }

  await client.close();
});

// ------------------------------------------------------------
// 6. Edge cases: invalid updates
// ------------------------------------------------------------
Deno.test("prevents updating to negative amount", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Movies" as ID,
    cost: 50,
  })) as { expenseId: ID };

  await concept.addContribution({
    userId: USER_CHARLIE,
    expenseId,
    amount: 20,
  });
  const result = await concept.updateContribution({
    userId: USER_CHARLIE,
    expenseId,
    newAmount: -10,
  });
  assertObjectMatch(result, {
    error: "New contribution amount cannot be negative.",
  });

  await client.close();
});

Deno.test("prevents updating non-contributor", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Books" as ID,
    cost: 50,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 20 });
  const result = await concept.updateContribution({
    userId: USER_BOB,
    expenseId,
    newAmount: 10,
  });
  assertObjectMatch(result, {
    error:
      `User '${USER_BOB}' is not a contributor for expense '${expenseId}'.`,
  });

  await client.close();
});

// ------------------------------------------------------------
// 7. Contribution overflow protection
// ------------------------------------------------------------
Deno.test("prevents adding contribution that exceeds remaining cost", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Party" as ID,
    cost: 100,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 60 });
  const result = await concept.addContribution({
    userId: USER_BOB,
    expenseId,
    amount: 50,
  });
  assertObjectMatch(result, {
    error:
      `Contribution amount '50' would cause total contributions '110' to exceed the expense cost '100'.`,
  });

  await client.close();
});

Deno.test("prevents updating contribution that exceeds total cost", async () => {
  const { concept, client } = await setupConcept();

  const { expenseId } = (await concept.create({
    item: "item:Donation" as ID,
    cost: 100,
  })) as { expenseId: ID };

  await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 60 });
  await concept.addContribution({ userId: USER_BOB, expenseId, amount: 10 });

  const fail = await concept.updateContribution({
    userId: USER_ALICE,
    expenseId,
    newAmount: 95,
  });
  assertObjectMatch(fail, {
    error:
      `New contribution amount '95' for user 'user:Alice' would cause total contributions '105' to exceed the expense cost '100'.`,
  });

  await client.close();
});

// --------------------------------------------------------------------------------------------
// 8. Lowering costs should not cause covered flag to become false if previously true
// --------------------------------------------------------------------------------------------
Deno.test("CostSplitting: updateCost - lower cost when already fully covered (over-contribution scenario)", async () => {
  const [db, client] = await testDb();
  const concept = new CostSplittingConcept(db);

  const item1 = "item:Lunch" as ID;
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;

  const initialCost = 100;
  const contributionA = 60;
  const contributionB = 40;
  const newLowerCost = 80;

  const createResult = await concept.create({ item: item1, cost: initialCost });
  if ("error" in createResult) throw new Error(createResult.error);
  const expenseId = createResult.expenseId as ID;

  const addA = await concept.addContribution({
    userId: userA,
    expenseId,
    amount: contributionA,
  });
  if ("error" in addA) throw new Error(addA.error);

  const addB = await concept.addContribution({
    userId: userB,
    expenseId,
    amount: contributionB,
  });
  if ("error" in addB) throw new Error(addB.error);

  const expenseBefore = await concept._getExpense({ expenseId });
  assertExists(expenseBefore, "Expense should exist after contributions");

  const totalBefore = expenseBefore.contributors.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  assertEquals(expenseBefore.cost, initialCost);
  assertEquals(totalBefore, contributionA + contributionB);
  assertEquals(expenseBefore.covered, true);

  const updateCostResult = await concept.updateCost({
    expenseId,
    newCost: newLowerCost,
  });
  if ("error" in updateCostResult) throw new Error(updateCostResult.error);

  const expenseAfter = await concept._getExpense({ expenseId });
  assertExists(expenseAfter, "Expense should exist after cost update");

  const totalAfter = expenseAfter.contributors.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  assertEquals(expenseAfter.cost, newLowerCost, "Cost should update to 80.");
  assertEquals(
    totalAfter,
    contributionA + contributionB,
    "Total contributions remain 100.",
  );
  assertEquals(expenseAfter.covered, true, "Expense remains covered.");
  assertEquals(
    totalAfter > expenseAfter.cost,
    true,
    "Expense is over-contributed.",
  );

  await client.close();
});
