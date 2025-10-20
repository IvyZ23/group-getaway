---
timestamp: 'Sun Oct 19 2025 18:01:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_180123.dd057880.md]]'
content_id: 06d53c0481b22a94e26421eae2142ce61459c50ab82d70fdc3a1c15557a608d6
---

# API Specification: Polling Concept

**Purpose:** To allow users to create polls with multiple options, cast votes, and view results.

***

## API Endpoints

### POST /api/Polling/createPoll

**Description:** Creates a new poll with a question, a set of options, and a creator.

**Requirements:**

* `question` is not empty.
* `options` contains at least two unique strings.

**Effects:**

* A new Poll `p` is created with `question`, `options` (each with 0 votes), `creator`, `createdAt`, and `isOpen` true. `p` is returned as `poll`.

**Request Body:**

```json
{
  "question": "string",
  "options": [
    "string"
  ],
  "creator": "string"
}
```

**Success Response Body (Action):**

```json
{
  "poll": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Polling/vote

**Description:** Casts a vote for a specific option in an open poll by a user.

**Requirements:**

* `poll` exists and is open.
* `optionName` is one of the poll's options.
* `voter` has not already voted in this poll.

**Effects:**

* The vote count for `optionName` in `poll` is incremented.
* A new Vote is recorded for `voter` in `poll` for `optionName`.

**Request Body:**

```json
{
  "poll": "string",
  "voter": "string",
  "optionName": "string"
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

### POST /api/Polling/closePoll

**Description:** Closes an open poll, preventing further votes from being cast.

**Requirements:**

* `poll` exists and is open.

**Effects:**

* The `isOpen` property of `poll` is set to `false`.
* No further votes can be cast for this poll.

**Request Body:**

```json
{
  "poll": "string"
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

### POST /api/Polling/\_getPoll

**Description:** Retrieves the full details of a specific poll, including its current results.

**Requirements:**

* `poll` exists.

**Effects:**

* Returns the details of the specified `poll`, including its current results.

**Request Body:**

```json
{
  "poll": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "question": "string",
    "creator": "string",
    "options": [
      {
        "name": "string",
        "votes": "number"
      }
    ],
    "createdAt": "number",
    "isOpen": "boolean"
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

### POST /api/Polling/\_getPollsByCreator

**Description:** Retrieves a list of polls created by a specific user.

**Requirements:**

* `creator` exists.

**Effects:**

* Returns a list of polls created by `creator`.

**Request Body:**

```json
{
  "creator": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "question": "string",
    "creator": "string",
    "createdAt": "number",
    "isOpen": "boolean"
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

### POST /api/Polling/\_getVote

**Description:** Retrieves the specific option a user voted for in a given poll.

**Requirements:**

* `poll` exists.
* `voter` has voted in `poll`.

**Effects:**

* Returns the `optionName` that `voter` chose in `poll`.

**Request Body:**

```json
{
  "poll": "string",
  "voter": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "optionName": "string"
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
