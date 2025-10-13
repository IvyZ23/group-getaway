---
timestamp: 'Mon Oct 13 2025 01:45:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_014523.5e31d59b.md]]'
content_id: 71f18e91828b7fc44079ab8f7613fe4fd2a58e953e1b8d2b3e2a1c6f789b9820
---

# implement: Cost Splitting

**concept** CostSplitting \[Itinerary, Item]

**purpose** allow for easier planning on how an expense would be paid for

**principle** An expense is created. Users can add themselves as
a contributor and cover a certain amount of the expense. Once the expense
has been fully covered, users can no longer contribute.

**state**

a set of Expenses with

* an item Item
* a cost Number
* a set of Contributors
* a covered Flag

a set of Contributors

* a user User
* a amount Number

**actions**

create(item: Item, cost: Number): Expense

* **requires** item to not already be added as an expense
* **effects** creates new expense

remove(expense: Expense)

* **requires** expense to exist
* **effects** deletes expense and contributions associated with it

addContribution(user: User, expense: Expense, amount: Number)

* **requires** expense to exist and amount to not be more than what is needed
* **effects** if user already exists as contributor, merge the amounts, else add user as a new contributor

updateContribution(user: User, new: Number, expense: Expense)

* **requires** user to exist as a contributor for expense
* **effects** updates user's contribution amount
