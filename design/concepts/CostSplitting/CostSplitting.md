**concept** CostSplitting [Itinerary, Item]

**purpose** allow for easier planning on how an expense would be paid for

**principle** An expense is created. Users can add themselves as
a contributor and cover a certain amount of the expense. Once the expense
has been fully covered, users can no longer contribute.

**state**

a set of Expenses with

-   an item Item
-   a cost Number
-   a set of Contributors
-   a covered Flag

a set of Contributors

-   a user User
-   a amount Number

**actions**

create(item: Item, cost: Number): Expense

-   **requires** item to not already be added as an expense and cost to be positive
-   **effects** creates new expense

remove(expense: Expense)

-   **requires** expense to exist
-   **effects** deletes expense and contributions associated with it

updateCost(expense: Expense, newCost: Number)

-   **requires** expense to exist. newCost must be positive
-   **effects** updates the cost of the item and recalculates the `covered` flag based on current contributions

addContribution(user: User, expense: Expense, amount: Number)

-   **requires** expense to exist and amount to not be more than what is needed and amount to be positive
-   **effects** if user already exists as contributor, merge the amounts, else add user as a new contributor

updateContribution(user: User, newAmount: Number, expense: Expense)

-   **requires** user to exist as a contributor for `expense`. `newAmount` must be non-negative (zero allowed).
-   **effects** updates user's contribution amount. The total contributions after the update must not exceed the expense cost. Updates the `covered` flag if status changes.
