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

-   **requires** item to not already be added as an expense
-   **effects** creates new expense

remove(expense: Expense)

-   **requires** expense to exist
-   **effects** deletes expense and contributions associated with it

addContribution(user: User, expense: Expense, amount: Number)

-   **requires** expense to exist and amount to not be more than what is needed
-   **effects** if user already exists as contributor, merge the amounts, else add user as a new contributor

updateContribution(user: User, new: Number, expense: Expense)

-   **requires** user to exist as a contributor for expense
-   **effects** updates user's contribution amount
