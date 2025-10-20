---
timestamp: 'Sun Oct 19 2025 18:01:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_180123.dd057880.md]]'
content_id: f867124a49bc6f076e68f7f40062cea5fae26cb3fa150ebe6e282a79823df6da
---

# API Specification: CostSplitting Concept

**Purpose:** Facilitate tracking, calculating, and settling of shared expenses and debts among multiple individuals.

***

## API Endpoints

### POST /api/CostSplitting/addExpense

**Description:** Records a new expense paid by one individual on behalf of others.

**Requirements:**

* `amount` > 0
* `owedBy` is not empty.

**Effects:**

* A new Expense `e` is created with `payer`, `description`, `amount`, `owedBy`, and `createdAt` set. `e` is returned as `expense`.

**Request Body:**

```json
{
  "payer": "string",
  "description": "string",
  "amount": "number",
  "owedBy": [
    "string"
  ]
}
```

**Success Response Body (Action):**

```json
{
  "expense": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CostSplitting/settleDebt

**Description:** Records a settlement for a portion or full amount of debt from a payer to a payee.

**Requirements:**

* `payer` and `payee` exist.
* `payer` owes `payee` at least `amount`.

**Effects:**

* A new Settlement is recorded for `amount` from `payer` to `payee`.
* The outstanding debt between them is reduced by `amount`.

**Request Body:**

```json
{
  "payer": "string",
  "payee": "string",
  "amount": "number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CostSplitting/\_getExpenses

**Description:** Retrieves a list of all expenses, optionally filtered by the payer or a payee.

**Requirements:**

* true

**Effects:**

* Returns a list of all expenses, optionally filtered by `payer` (who paid) or `payee` (who owes).

**Request Body:**

```json
{
  "payer": "string",
  "payee": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "payer": "string",
    "description": "string",
    "amount": "number",
    "owedBy": [
      "string"
    ],
    "createdAt": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CostSplitting/\_getDebts

**Description:** Retrieves the total amount a specified payer owes to each payee.

**Requirements:**

* true

**Effects:**

* Returns the total amount `payer` owes to each `payee` as a list of debts. If no `payer` is specified, returns all outstanding debts.

**Request Body:**

```json
{
  "payer": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "payee": "string",
    "amount": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CostSplitting/\_getCreditors

**Description:** Retrieves the total amount each payer owes to a specified payee.

**Requirements:**

* true

**Effects:**

* Returns the total amount each `payer` owes to the specified `payee` as a list of creditors. If no `payee` is specified, returns all outstanding credits.

**Request Body:**

```json
{
  "payee": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "payer": "string",
    "amount": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
