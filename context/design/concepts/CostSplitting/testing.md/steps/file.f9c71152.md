---
timestamp: 'Wed Oct 15 2025 18:43:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_184317.d833f726.md]]'
content_id: f9c711526815c74a9d48f786f390ec8743de8514fb950415e02463d4679703c1
---

# file: src/CostSplitting/CostSplittingConcept.test.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import CostSplittingConcept, { Expense, Item, User } from "./CostSplittingConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("CostSplitting: updateCost - lower cost when already fully covered (over-contribution scenario)", async () => {
  const [db, client] = await testDb();
  const concept = new CostSplittingConcept(db);

  const item1 = "item:Lunch" as Item;
  const userA = "user:Alice" as User;
  const userB = "user:Bob" as User;
  const initialCost = 100;
  const contributionA = 60;
  const contributionB = 40; // Total 100, exactly covering the initial cost
  const newLowerCost = 80;  // Lowered cost, which will make it over-contributed

  let expenseId: Expense;

  // # trace: Create the expense
  // Principle: An expense is created.
  const createResult = await concept.create({ item: item1, cost: initialCost });
  if ("error" in createResult) throw new Error(createResult.error);
  expenseId = createResult.expense;
  console.log(`Created Expense: ${expenseId} for item: ${item1} with cost: ${initialCost}`);

  // # trace: Alice contributes 60
  const addA = await concept.addContribution({ user: userA, expense: expenseId, amount: contributionA });
  if ("error" in addA) throw new Error(addA.error);
  console.log(`User ${userA} contributed ${contributionA}`);

  // # trace: Bob contributes 40, fully covering the item
  const addB = await concept.addContribution({ user: userB, expense: expenseId, amount: contributionB });
  if ("error" in addB) throw new Error(addB.error);
  console.log(`User ${userB} contributed ${contributionB}`);

  // Check initial state: expense should be fully covered
  const expenseAfterContributions = await concept._getExpense({ expense: expenseId });
  if (!expenseAfterContributions.expense) throw new Error("Expense not found after contributions.");

  console.log("--- Initial State Check ---");
  console.log("Expense cost:", expenseAfterContributions.expense.cost);
  console.log("Total contributions:", expenseAfterContributions.expense.totalContributions);
  console.log("Is covered:", expenseAfterContributions.expense.covered);

  assertEquals(expenseAfterContributions.expense.cost, initialCost, "Initial cost should be 100.");
  assertEquals(expenseAfterContributions.expense.totalContributions, contributionA + contributionB, "Total contributions should be 100.");
  assertEquals(expenseAfterContributions.expense.covered, true, "Expense should be covered initially.");
  console.log("Initial state: Expense is correctly covered.");

  // # trace: Lower the price of the item
  // Action: updateCost (expense: Expense, newCost: Number)
  // Effects: Updates the cost, re-evaluates 'covered'. Allows totalContributions > newCost.
  const updateCostResult = await concept.updateCost({ expense: expenseId, newCost: newLowerCost });
  if ("error" in updateCostResult) throw new Error(updateCostResult.error);
  console.log(`Updated cost of Expense ${expenseId} to ${newLowerCost}`);

  // Check if the item is still covered after the price has been lowered
  // It should still be covered, but now 'over-contributed'
  const expenseAfterCostUpdate = await concept._getExpense({ expense: expenseId });
  if (!expenseAfterCostUpdate.expense) throw new Error("Expense not found after cost update.");

  console.log("--- State After Lowering Cost ---");
  console.log("Expense cost:", expenseAfterCostUpdate.expense.cost);
  console.log("Total contributions:", expenseAfterCostUpdate.expense.totalContributions);
  console.log("Is covered:", expenseAfterCostUpdate.expense.covered);
  console.log(`Expected total contributions (${contributionA + contributionB}) >= new cost (${newLowerCost}) = ${ (contributionA + contributionB) >= newLowerCost }`);

  assertEquals(expenseAfterCostUpdate.expense.cost, newLowerCost, "Cost should be updated to 80.");
  assertEquals(expenseAfterCostUpdate.expense.totalContributions, contributionA + contributionB, "Total contributions should remain 100 (not auto-adjusted).");
  assertEquals(expenseAfterCostUpdate.expense.covered, true, "Expense should still be covered (over-contributed).");
  assertEquals(expenseAfterCostUpdate.expense.totalContributions > expenseAfterCostUpdate.expense.cost, true, "Expense should be in an over-contributed state.");
  console.log("Final state: Expense cost updated, remains covered, and is now over-contributed as expected.");

  await client.close();
});

// A quick test for an error case (negative cost)
Deno.test("CostSplitting: updateCost - should not allow non-positive cost", async () => {
  const [db, client] = await testDb();
  const concept = new CostSplittingConcept(db);

  const item1 = "item:Dinner" as Item;
  const initialCost = 50;
  const createResult = await concept.create({ item: item1, cost: initialCost });
  if ("error" in createResult) throw new Error(createResult.error);
  const expenseId = createResult.expense;

  const updateCostResult = await concept.updateCost({ expense: expenseId, newCost: 0 });
  assertEquals("error" in updateCostResult, true, "Should return an error for non-positive cost.");
  assertEquals(updateCostResult.error, "New cost must be positive.", "Error message should match.");

  const updateCostResult2 = await concept.updateCost({ expense: expenseId, newCost: -10 });
  assertEquals("error" in updateCostResult2, true, "Should return an error for negative cost.");
  assertEquals(updateCostResult2.error, "New cost must be positive.", "Error message should match for negative cost.");

  await client.close();
});
```
