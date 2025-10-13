---
timestamp: 'Mon Oct 13 2025 01:55:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_015510.5b876fec.md]]'
content_id: b4de055463a1ffa7456e298a578eb4b3565511223eb58f52c2f64b074c2ff45f
---

# response:

```typescript
// file: src/CostSplitting/CostSplittingConcept.test.ts
import { Collection, Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertExists, assertObjectMatch, assertRejects } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as necessary
import { ID } from "../../utils/types.ts";     // Adjust path as necessary
import CostSplittingConcept from "./CostSplittingConcept.ts";

// Predefined IDs for testing
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const USER_CHARLIE = "user:Charlie" as ID;
const ITEM_DINNER = "item:Dinner" as ID;
const ITEM_FLIGHT = "item:Flight" as ID;
const ITEM_HOTEL = "item:Hotel" as ID;

Deno.test("CostSplitting Concept Tests", async (test) => {
  let db: Db;
  let client: MongoClient;
  let concept: CostSplittingConcept;

  // Setup before each test suite
  Deno.test.beforeAll(async () => {
    [db, client] = await testDb();
    concept = new CostSplittingConcept(db);
  });

  // Teardown after all tests in the suite
  Deno.test.afterAll(async () => {
    await client.close();
  });

  /**
   * # trace: Operational Principle Test
   *
   * @principle An expense is created. Users can add themselves as a contributor and cover a certain amount of the expense.
   *            Once the expense has been fully covered, users can no longer contribute.
   */
  await test.step("should model the operational principle correctly", async () => {
    // 1. Create an expense
    const createResult = await concept.create({ item: ITEM_DINNER, cost: 100 });
    assertExists(createResult, "create should return a result");
    assertEquals("expenseId" in createResult, true, "create should return an expense ID");
    const expenseId = (createResult as { expenseId: ID }).expenseId;
    assertExists(expenseId, "expenseId should be defined");

    let expense = await concept._getExpense({ expenseId });
    assertExists(expense, "Expense should exist after creation");
    assertEquals(expense.cost, 100);
    assertEquals(expense.contributors.length, 0);
    assertEquals(expense.covered, false);

    // 2. User A adds a contribution
    const addResultAlice1 = await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 40 });
    assertObjectMatch(addResultAlice1, {}, "Alice's first contribution should succeed");

    expense = await concept._getExpense({ expenseId });
    assertExists(expense, "Expense should still exist after Alice's contribution");
    assertEquals(expense.contributors.length, 1);
    assertObjectMatch(expense.contributors[0], { userId: USER_ALICE, amount: 40 });
    assertEquals(expense.covered, false);
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 40);

    // 3. User B adds a contribution
    const addResultBob = await concept.addContribution({ userId: USER_BOB, expenseId, amount: 30 });
    assertObjectMatch(addResultBob, {}, "Bob's contribution should succeed");

    expense = await concept._getExpense({ expenseId });
    assertExists(expense, "Expense should still exist after Bob's contribution");
    assertEquals(expense.contributors.length, 2);
    assertObjectMatch(expense.contributors.find(c => c.userId === USER_BOB)!, { userId: USER_BOB, amount: 30 });
    assertEquals(expense.covered, false);
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 70);

    // 4. User A adds another contribution, covering the rest
    const addResultAlice2 = await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 30 }); // 40 + 30 = 70
    assertObjectMatch(addResultAlice2, {}, "Alice's second contribution should succeed and cover the expense");

    expense = await concept._getExpense({ expenseId });
    assertExists(expense, "Expense should still exist after Alice's second contribution");
    assertEquals(expense.contributors.length, 2); // Still 2 contributors, Alice's amount merged
    assertObjectMatch(expense.contributors.find(c => c.userId === USER_ALICE)!, { userId: USER_ALICE, amount: 70 });
    assertEquals(expense.covered, true, "Expense should be marked as covered");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 100);

    // 5. Try to add more contributions when covered (should fail)
    const addResultCharlie = await concept.addContribution({ userId: USER_CHARLIE, expenseId, amount: 10 });
    assertObjectMatch(addResultCharlie, { error: `Expense '${expenseId}' is already fully covered. No more contributions can be added.` }, "Charlie's contribution should fail as expense is covered");

    // Verify state hasn't changed
    expense = await concept._getExpense({ expenseId });
    assertEquals(expense.contributors.length, 2);
    assertEquals(expense.covered, true);
  });

  await test.step("should prevent creating expense with non-positive cost", async () => {
    const result = await concept.create({ item: "item:ZeroCost" as ID, cost: 0 });
    assertObjectMatch(result, { error: "Expense cost must be positive." });

    const resultNegative = await concept.create({ item: "item:NegativeCost" as ID, cost: -50 });
    assertObjectMatch(resultNegative, { error: "Expense cost must be positive." });
  });

  await test.step("should prevent creating expense for an item that already exists", async () => {
    const createResult1 = await concept.create({ item: ITEM_FLIGHT, cost: 500 });
    assertEquals("expenseId" in createResult1, true, "First creation should succeed");

    const createResult2 = await concept.create({ item: ITEM_FLIGHT, cost: 600 });
    assertObjectMatch(createResult2, { error: `Item '${ITEM_FLIGHT}' already exists as an expense.` });
  });

  await test.step("should fail to remove a non-existing expense", async () => {
    const nonExistentId = "expense:nonexistent" as ID;
    const removeResult = await concept.remove({ expenseId: nonExistentId });
    assertObjectMatch(removeResult, { error: `Expense with ID '${nonExistentId}' not found.` });
  });

  await test.step("should mark an item as covered when total contributions meet or exceed its cost", async () => {
    const createResult = await concept.create({ item: ITEM_HOTEL, cost: 200 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 100 });
    await concept.addContribution({ userId: USER_BOB, expenseId, amount: 99 });

    let expense = await concept._getExpense({ expenseId });
    assertEquals(expense?.covered, false, "Expense should not be covered yet");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 199);

    // Last contribution to cover it
    await concept.addContribution({ userId: USER_CHARLIE, expenseId, amount: 1 });

    expense = await concept._getExpense({ expenseId });
    assertEquals(expense?.covered, true, "Expense should be marked as covered");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 200);

    // Test exceeding cost
    const createResultOver = await concept.create({ item: "item:CarRental" as ID, cost: 50 });
    const expenseIdOver = (createResultOver as { expenseId: ID }).expenseId;
    await concept.addContribution({ userId: USER_ALICE, expenseId: expenseIdOver, amount: 60 }); // Exceeds cost

    const expenseOver = await concept._getExpense({ expenseId: expenseIdOver });
    assertEquals(expenseOver?.covered, true, "Expense should be marked as covered even if contributions exceed cost");
    assertEquals((await concept._getTotalContributions({ expenseId: expenseIdOver }))?.total, 60);
  });

  await test.step("should merge amounts when the same user adds another contribution", async () => {
    const createResult = await concept.create({ item: "item:Groceries" as ID, cost: 80 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 20 });
    let aliceContribution = await concept._getUserContribution({ userId: USER_ALICE, expenseId });
    assertEquals(aliceContribution?.amount, 20);

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 30 }); // Alice adds more
    aliceContribution = await concept._getUserContribution({ userId: USER_ALICE, expenseId });
    assertEquals(aliceContribution?.amount, 50, "Alice's contribution should be merged to 50");

    const expense = await concept._getExpense({ expenseId });
    assertEquals(expense?.contributors.length, 1, "Should still be one contributor (Alice)");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 50);
    assertEquals(expense?.covered, false);
  });

  await test.step("should replace old contribution when the same user updates their contribution", async () => {
    const createResult = await concept.create({ item: "item:Utilities" as ID, cost: 120 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_BOB, expenseId, amount: 60 });
    let bobContribution = await concept._getUserContribution({ userId: USER_BOB, expenseId });
    assertEquals(bobContribution?.amount, 60);

    await concept.updateContribution({ userId: USER_BOB, expenseId, newAmount: 80 }); // Bob updates
    bobContribution = await concept._getUserContribution({ userId: USER_BOB, expenseId });
    assertEquals(bobContribution?.amount, 80, "Bob's contribution should be updated to 80");

    const expense = await concept._getExpense({ expenseId });
    assertEquals(expense?.contributors.length, 1, "Should still be one contributor (Bob)");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 80);
    assertEquals(expense?.covered, false);
  });

  await test.step("should update user's contribution to 0 when user updates contribution to 0", async () => {
    const createResult = await concept.create({ item: "item:Rent" as ID, cost: 1000 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 500 });
    let aliceContribution = await concept._getUserContribution({ userId: USER_ALICE, expenseId });
    assertEquals(aliceContribution?.amount, 500);

    await concept.updateContribution({ userId: USER_ALICE, expenseId, newAmount: 0 }); // Alice changes to 0
    aliceContribution = await concept._getUserContribution({ userId: USER_ALICE, expenseId });
    assertEquals(aliceContribution?.amount, 0, "Alice's contribution should be updated to 0");

    const expense = await concept._getExpense({ expenseId });
    // Note: The current implementation sets the amount to 0 but does not remove the contributor from the array.
    // If explicit removal was desired, the logic would need to use $pull.
    assertEquals(expense?.contributors.length, 1, "Alice should still be listed as a contributor with 0 amount");
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 0);
    assertEquals(expense?.covered, false);
  });

  await test.step("should not allow user to update contribution to negative numbers", async () => {
    const createResult = await concept.create({ item: "item:Movies" as ID, cost: 50 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_CHARLIE, expenseId, amount: 20 });
    let charlieContribution = await concept._getUserContribution({ userId: USER_CHARLIE, expenseId });
    assertEquals(charlieContribution?.amount, 20);

    const updateResult = await concept.updateContribution({ userId: USER_CHARLIE, expenseId, newAmount: -10 });
    assertObjectMatch(updateResult, { error: "New contribution amount cannot be negative." }, "Update with negative amount should fail");

    // Verify contribution didn't change
    charlieContribution = await concept._getUserContribution({ userId: USER_CHARLIE, expenseId });
    assertEquals(charlieContribution?.amount, 20, "Charlie's contribution should remain 20");
  });

  await test.step("should allow multiple users to make contributions to one item", async () => {
    const createResult = await concept.create({ item: "item:Vacation" as ID, cost: 1000 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 300 });
    await concept.addContribution({ userId: USER_BOB, expenseId, amount: 400 });
    await concept.addContribution({ userId: USER_CHARLIE, expenseId, amount: 200 });

    const expense = await concept._getExpense({ expenseId });
    assertExists(expense);
    assertEquals(expense.contributors.length, 3, "Should have three distinct contributors");
    assertObjectMatch(expense.contributors.find(c => c.userId === USER_ALICE)!, { amount: 300 });
    assertObjectMatch(expense.contributors.find(c => c.userId === USER_BOB)!, { amount: 400 });
    assertObjectMatch(expense.contributors.find(c => c.userId === USER_CHARLIE)!, { amount: 200 });

    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 900);
    assertEquals(expense.covered, false);
  });

  await test.step("should prevent contributions that exceed the remaining cost when adding", async () => {
    const createResult = await concept.create({ item: "item:Party" as ID, cost: 100 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 60 });
    const result = await concept.addContribution({ userId: USER_BOB, expenseId, amount: 50 }); // 60 + 50 = 110 > 100
    assertObjectMatch(result, { error: `Contribution amount '50' would cause total contributions '110' to exceed the expense cost '100'.` });

    // Verify state is unchanged for Bob
    const expense = await concept._getExpense({ expenseId });
    assertEquals(expense?.contributors.length, 1);
    assertObjectMatch(expense?.contributors[0]!, { userId: USER_ALICE, amount: 60 });
    assertEquals((await concept._getTotalContributions({ expenseId }))?.total, 60);
  });

  await test.step("should prevent contributions that exceed the remaining cost when updating", async () => {
    const createResult = await concept.create({ item: "item:Donation" as ID, cost: 100 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 60 });
    await concept.addContribution({ userId: USER_BOB, expenseId, amount: 10 });

    const result = await concept.updateContribution({ userId: USER_ALICE, expenseId, newAmount: 80 }); // 10 (Bob) + 80 (Alice new) = 90. Valid.
    assertObjectMatch(result, {});

    const resultFail = await concept.updateContribution({ userId: USER_ALICE, expenseId, newAmount: 95 }); // 10 (Bob) + 95 (Alice new) = 105 > 100. Invalid.
    assertObjectMatch(resultFail, { error: `New contribution amount '95' for user 'user:Alice' would cause total contributions '105' to exceed the expense cost '100'.` });

    // Verify Alice's contribution did not change from previous valid update
    let aliceContribution = await concept._getUserContribution({ userId: USER_ALICE, expenseId });
    assertEquals(aliceContribution?.amount, 80);
  });

  await test.step("should fail to add contribution if expense does not exist", async () => {
    const nonExistentId = "expense:noexist" as ID;
    const result = await concept.addContribution({ userId: USER_ALICE, expenseId: nonExistentId, amount: 10 });
    assertObjectMatch(result, { error: `Expense with ID '${nonExistentId}' not found.` });
  });

  await test.step("should fail to update contribution if expense does not exist", async () => {
    const nonExistentId = "expense:noexist-update" as ID;
    const result = await concept.updateContribution({ userId: USER_ALICE, expenseId: nonExistentId, newAmount: 10 });
    assertObjectMatch(result, { error: `Expense with ID '${nonExistentId}' not found.` });
  });

  await test.step("should fail to update contribution if user is not a contributor", async () => {
    const createResult = await concept.create({ item: "item:Books" as ID, cost: 50 });
    const expenseId = (createResult as { expenseId: ID }).expenseId;

    await concept.addContribution({ userId: USER_ALICE, expenseId, amount: 20 });
    const result = await concept.updateContribution({ userId: USER_BOB, expenseId, newAmount: 10 }); // Bob is not a contributor
    assertObjectMatch(result, { error: `User '${USER_BOB}' is not a contributor for expense '${expenseId}'.` });
  });
});
```
