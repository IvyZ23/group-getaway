---
timestamp: 'Wed Oct 15 2025 18:19:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_181958.a1327380.md]]'
content_id: 79c7938f708498c3add5aaf6e13f563c993d14e142ed19bfa5886cc6b47a6179
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

I want to have a function that allows a user to update the total cost of an item. However, what are some ways to efficiently update the other fields (such as contributors, and covered). If the cost is lowered and the contributions are more than enough, what are the pros and cons of picking contributors to remove so that the contirbutions don't exceed the cost? Or would resetting the contributors back into an empty set be a viable idea? Can you give me some other ideas as well.
