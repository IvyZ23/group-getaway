---
timestamp: 'Sat Nov 01 2025 12:53:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251101_125349.5e169da3.md]]'
content_id: 399336526a3835d65d73f4f323b3d370c2572f232679c1fda5eab602d50769cc
---

# response:

The provided `CostSplitting` concept is well-defined and includes actions for creating, removing, updating, and querying expenses and contributions. To make this concept functional within the Concept Design framework, we need to define `synchronizations` (syncs) that orchestrate its interaction with user requests and potentially other concepts like `Sessioning` (for authentication).

Below are the `syncs` for the `CostSplitting` application, following the structure and patterns described in the documentation, including authorization checks via a hypothetical `Sessioning` concept.

**Assumed Concepts for Context:**

* **`Requesting`**: This concept handles incoming HTTP requests and outgoing responses.
  * `request (path: String, ...)`: Fired when an HTTP request comes in. The parameters `...` capture the request body/query params.
  * `respond (request: ID, ...)`: Used to send an HTTP response back to the client.
* **`Sessioning`**: This concept is assumed to manage user sessions and provide user authentication.
  * `_getUser (session: ID) : (user: User)`: A query that, given a session ID, returns the user ID if the session is valid. It's assumed to return `[{ user: USER_ID }]` on success or `[]` on failure.

***

**File: `src/syncs/costsplitting.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning } from "@concepts"; // Assuming Sessioning exists and is imported via @concepts
import CostSplittingConcept from "@concepts/CostSplitting/CostSplittingConcept.ts";

// Alias CostSplittingConcept for cleaner use in syncs
const CostSplitting = CostSplittingConcept;

// Type parameters for better readability and consistency with concept spec
type Item = string;
type User = string;
type ExpenseId = string;

// --- 1. Create Expense ---

/**
 * Sync: UnauthorizedCreateExpense
 * Catches requests to create an expense where authentication fails.
 * Responds with an error and prevents the `CostSplitting.create` action from being triggered.
 */
export const UnauthorizedCreateExpense: Sync = ({ request, session, item, cost, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/create", item, cost, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' }); // Attempt authentication
    
    if (authCheckFrames.length === 0) {
      // If no user found for session, this frame is unauthorized.
      // We create a new frame with the `errorMsg` symbol bound to an error message.
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to create an expense." });
    }
    return new Frames(); // If authentication succeeded, this sync does not apply, so return empty frames.
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }], // Respond with the bound error message
  ),
});

/**
 * Sync: AuthorizedCreateExpense
 * Handles authenticated requests to create a new expense.
 * Triggers `CostSplitting.create` if authentication succeeds.
 */
export const AuthorizedCreateExpense: Sync = ({ request, item, cost, session, authUser }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/create", item, cost, session }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user. Only frames where authentication succeeded will pass.
    return await frames.query(Sessioning._getUser, { session }, { user: authUser });
  },
  then: actions(
    // If authenticated, proceed to create the expense. Outputs (expenseId, error)
    // will be handled by subsequent response syncs.
    [CostSplitting.create, { item, cost }, { }],
  ),
});

/**
 * Sync: CreateExpenseResponseSuccess
 * Responds to the original request after a successful `CostSplitting.create` action.
 */
export const CreateExpenseResponseSuccess: Sync = ({ request, expenseId }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/create" }, { request }], // Matches the original request context
    [CostSplitting.create, {}, { expenseId }], // Matches successful output from the create action
  ),
  then: actions(
    [Requesting.respond, { request, expenseId }], // Respond with the new expense ID
  ),
});

/**
 * Sync: CreateExpenseResponseError
 * Responds to the original request after a failed `CostSplitting.create` action.
 */
export const CreateExpenseResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/create" }, { request }], // Matches the original request context
    [CostSplitting.create, {}, { error }], // Matches error output from the create action
  ),
  then: actions(
    [Requesting.respond, { request, error }], // Respond with the error message from the concept
  ),
});

// --- 2. Remove Expense ---

/**
 * Sync: UnauthorizedRemoveExpense
 * Catches requests to remove an expense where authentication fails.
 */
export const UnauthorizedRemoveExpense: Sync = ({ request, session, expenseId, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/remove", expenseId, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to remove an expense." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedRemoveExpense
 * Handles authenticated requests to remove an expense.
 * Triggers `CostSplitting.remove`.
 */
export const AuthorizedRemoveExpense: Sync = ({ request, expenseId, session, authUser }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/remove", expenseId, session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });
    // TODO: Add specific authorization check if `ExpenseDocument` had an owner field.
    // Example: `frames = await frames.query(CostSplitting._getExpense, { expenseId }, { expense: { _id: expenseId, owner: authUser } });`
    return frames;
  },
  then: actions(
    [CostSplitting.remove, { expenseId }, { }],
  ),
});

/**
 * Sync: RemoveExpenseResponseSuccess
 * Responds after a successful `CostSplitting.remove` action.
 */
export const RemoveExpenseResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/remove" }, { request }],
    [CostSplitting.remove, {}, {}], // Matches successful removal (returns Empty)
  ),
  then: actions(
    [Requesting.respond, { request, status: "Expense removed successfully." }],
  ),
});

/**
 * Sync: RemoveExpenseResponseError
 * Responds after a failed `CostSplitting.remove` action.
 */
export const RemoveExpenseResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/remove" }, { request }],
    [CostSplitting.remove, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 3. Update Expense Cost ---

/**
 * Sync: UnauthorizedUpdateExpenseCost
 * Catches requests to update an expense cost where authentication fails.
 */
export const UnauthorizedUpdateExpenseCost: Sync = ({ request, session, expenseId, newCost, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-cost", expenseId, newCost, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to update an expense cost." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedUpdateExpenseCost
 * Handles authenticated requests to update an expense's cost.
 * Triggers `CostSplitting.updateCost`.
 */
export const AuthorizedUpdateExpenseCost: Sync = ({ request, expenseId, newCost, session, authUser }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-cost", expenseId, newCost, session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });
    // TODO: Add specific authorization check (e.g., only expense owner can update cost)
    return frames;
  },
  then: actions(
    [CostSplitting.updateCost, { expenseId, newCost }, { }],
  ),
});

/**
 * Sync: UpdateExpenseCostResponseSuccess
 * Responds after a successful `CostSplitting.updateCost` action.
 */
export const UpdateExpenseCostResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-cost" }, { request }],
    [CostSplitting.updateCost, {}, {}], // Successful update (returns Empty)
  ),
  then: actions(
    [Requesting.respond, { request, status: "Expense cost updated successfully." }],
  ),
});

/**
 * Sync: UpdateExpenseCostResponseError
 * Responds after a failed `CostSplitting.updateCost` action.
 */
export const UpdateExpenseCostResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-cost" }, { request }],
    [CostSplitting.updateCost, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 4. Add Contribution ---

/**
 * Sync: UnauthorizedAddContribution
 * Catches requests to add a contribution where authentication fails.
 */
export const UnauthorizedAddContribution: Sync = ({ request, session, expenseId, amount, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/add-contribution", expenseId, amount, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to add a contribution." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedAddContribution
 * Handles authenticated requests to add a user's contribution to an expense.
 * Triggers `CostSplitting.addContribution` with the authenticated user's ID.
 */
export const AuthorizedAddContribution: Sync = ({ request, expenseId, amount, session, authUser }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/add-contribution", expenseId, amount, session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });
    // Authorization: User must be logged in to contribute. `authUser` will be passed as `userId`.
    return frames;
  },
  then: actions(
    [CostSplitting.addContribution, { expenseId, amount, userId: authUser }, { }],
  ),
});

/**
 * Sync: AddContributionResponseSuccess
 * Responds after a successful `CostSplitting.addContribution` action.
 */
export const AddContributionResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/add-contribution" }, { request }],
    [CostSplitting.addContribution, {}, {}], // Successful addition (returns Empty)
  ),
  then: actions(
    [Requesting.respond, { request, status: "Contribution added successfully." }],
  ),
});

/**
 * Sync: AddContributionResponseError
 * Responds after a failed `CostSplitting.addContribution` action.
 */
export const AddContributionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/add-contribution" }, { request }],
    [CostSplitting.addContribution, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 5. Update Contribution ---

/**
 * Sync: UnauthorizedUpdateContribution
 * Catches requests to update a contribution where authentication fails.
 */
export const UnauthorizedUpdateContribution: Sync = ({ request, session, expenseId, newAmount, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-contribution", expenseId, newAmount, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to update a contribution." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedUpdateContribution
 * Handles authenticated requests to update a user's existing contribution.
 * Triggers `CostSplitting.updateContribution` with the authenticated user's ID.
 */
export const AuthorizedUpdateContribution: Sync = ({ request, expenseId, newAmount, session, authUser }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-contribution", expenseId, newAmount, session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });
    // Authorization: User must be logged in to update their own contribution. `authUser` is the `userId`.
    return frames;
  },
  then: actions(
    [CostSplitting.updateContribution, { expenseId, newAmount, userId: authUser }, { }],
  ),
});

/**
 * Sync: UpdateContributionResponseSuccess
 * Responds after a successful `CostSplitting.updateContribution` action.
 */
export const UpdateContributionResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-contribution" }, { request }],
    [CostSplitting.updateContribution, {}, {}], // Successful update (returns Empty)
  ),
  then: actions(
    [Requesting.respond, { request, status: "Contribution updated successfully." }],
  ),
});

/**
 * Sync: UpdateContributionResponseError
 * Responds after a failed `CostSplitting.updateContribution` action.
 */
export const UpdateContributionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/update-contribution" }, { request }],
    [CostSplitting.updateContribution, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// --- 6. Get Expense Details (Query) ---

/**
 * Sync: UnauthorizedGetExpenseDetails
 * Catches requests to get expense details where authentication fails.
 */
export const UnauthorizedGetExpenseDetails: Sync = ({ request, session, expenseId, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/get", expenseId, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to view expense details." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedGetExpenseDetails
 * Handles authenticated requests to get details of a specific expense.
 * Queries `CostSplitting._getExpense` and responds.
 */
export const AuthorizedGetExpenseDetails: Sync = ({ request, expenseId, session, authUser, expense, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/get", expenseId, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });

    // Query for the expense details. _getExpense returns an array of { expense: ExpenseDocument }.
    frames = await frames.query(CostSplitting._getExpense, { expenseId }, { expense });
    
    if (frames.length === 0) {
      // If expense not found, or was filtered out by an authorization check (if added)
      return new Frames({ ...originalFrame, [error]: `Expense '${expenseId}' not found.` });
    }
    
    // Optional: Add more granular authorization (e.g., only contributors can view)
    // const authorizedViewFrames = new Frames();
    // for (const frame of frames) {
    //   const expenseDoc = frame[expense] as any; // Cast to access properties
    //   if (expenseDoc && expenseDoc.contributors.some((c: any) => c.userId === frame[authUser])) {
    //     authorizedViewFrames.push(frame);
    //   } else {
    //     return new Frames({ ...originalFrame, [error]: "Not authorized to view this expense." });
    //   }
    // }
    // return authorizedViewFrames;

    return frames;
  },
  then: actions(
    [Requesting.respond, { request, expense, error }], // Responds with expense object or an error
  ),
});

// --- 7. Get All Expenses By Item (Query) ---

/**
 * Sync: UnauthorizedGetExpensesByItem
 * Catches requests to get expenses by item where authentication fails.
 */
export const UnauthorizedGetExpensesByItem: Sync = ({ request, session, item, errorMsg }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/by-item", item, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];
    const authCheckFrames = await frames.query(Sessioning._getUser, { session }, { user: 'tempUser' });
    if (authCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, [errorMsg]: "Authentication required to view expenses by item." });
    }
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error: errorMsg }],
  ),
});

/**
 * Sync: AuthorizedGetExpensesByItem
 * Handles authenticated requests to get all expenses for a given item.
 * Queries `CostSplitting._getExpensesByItem` and responds.
 */
export const AuthorizedGetExpensesByItem: Sync = ({ request, item, session, authUser, expensesList, error }) => ({
  when: actions(
    [Requesting.request, { path: "/expenses/by-item", item, session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    frames = await frames.query(Sessioning._getUser, { session }, { user: authUser });

    // Query for expenses by item. _getExpensesByItem returns an array of { expense: ExpenseDocument }.
    // The `query` method will create a new frame for each expense document returned.
    let queriedFrames = await frames.query(CostSplitting._getExpensesByItem, { item }, { expense: 'individualExpense' });
    
    // If no expenses are found, ensure an empty list is returned in the response.
    if (queriedFrames.length === 0) {
      return new Frames({ ...originalFrame, [expensesList]: [] });
    }

    // Use collectAs to group all individual expense bindings into a single `expensesList` binding.
    return queriedFrames.collectAs(['individualExpense'], expensesList);
  },
  then: actions(
    [Requesting.respond, { request, expensesList, error }],
  ),
});

// --- Example of a cross-concept interaction (hypothetical) ---

/**
 * Sync: NotifyWhenExpenseFullyCovered (Hypothetical)
 * This sync demonstrates how other concepts (e.g., a Notification concept)
 * could react to changes in the CostSplitting concept's state.
 * Requires a `Notification` concept and potentially an action in `CostSplitting` to mark as notified.
 */
/*
// import { Notification } from "@concepts"; // Uncomment if Notification concept exists

export const NotifyWhenExpenseFullyCovered: Sync = ({ expenseId, expenseDoc, authUser, notificationMessage }) => ({
  when: actions(
    // This assumes some action in CostSplitting (e.g., `addContribution` or `updateCost`)
    // has completed and might have changed an expense's 'covered' status.
    // We'd typically match on an action and then query the state to check the condition.
    [CostSplitting.addContribution, {}, {}], // Trigger on any contribution update
  ),
  where: async (frames) => {
    // First, get the expense details
    frames = await frames.query(CostSplitting._getExpense, { expenseId }, { expense: expenseDoc });
    
    // Filter for expenses that are now covered and haven't been notified yet (requires a `notified` flag in ExpenseDocument)
    // Assuming ExpenseDocument: interface ExpenseDocument { ..., covered: boolean; notified?: boolean; }
    return frames.filter(($) => $[expenseDoc]?.covered === true && !$[expenseDoc]?.notified);
  },
  then: actions(
    // [Notification.notify, { message: `Expense "${expenseId}" is now fully covered!`, to: authUser }], // Notify the owner/all contributors
    // [CostSplitting.markExpenseNotified, { expenseId }], // Call a hypothetical action to prevent re-notification
  ),
});
*/
```
