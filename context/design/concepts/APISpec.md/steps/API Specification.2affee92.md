---
timestamp: 'Sun Oct 19 2025 18:01:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_180123.dd057880.md]]'
content_id: 2affee92ee5ccb895d72f8172031578433e5b1badf05c21a73d181ee3b6e1b53
---

# API Specification: UserAuth Concept

**Purpose:** To provide secure user registration and authentication using usernames and passwords.

***

## API Endpoints

### POST /api/UserAuth/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**

* `username` is unique.
* `password` meets complexity requirements.

**Effects:**

* A new User `u` is created with `username`, `hashedPassword`, and `salt`. `u` is returned as `user`.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuth/login

**Description:** Authenticates a user with provided username and password, returning an access token.

**Requirements:**

* `username` and `password` match an existing user.

**Effects:**

* A new Session `s` is created for the authenticated `user` with a `token` and `expiresAt`. `token` and `user` are returned.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "token": "string",
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuth/logout

**Description:** Invalidates an active user session using its token.

**Requirements:**

* `token` is a valid, active session token.

**Effects:**

* The Session associated with `token` is invalidated/deleted.

**Request Body:**

```json
{
  "token": "string"
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

### POST /api/UserAuth/changePassword

**Description:** Allows an authenticated user to change their password.

**Requirements:**

* `user` exists.
* `oldPassword` is correct.
* `newPassword` meets complexity requirements.

**Effects:**

* The `hashedPassword` and `salt` for `user` are updated with the `newPassword`.
* All active sessions for `user` are invalidated.

**Request Body:**

```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
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

### POST /api/UserAuth/\_getUserByToken

**Description:** Retrieves the user associated with a given authentication token.

**Requirements:**

* `token` is a valid, active session token.

**Effects:**

* Returns the `user` associated with the given `token`.

**Request Body:**

```json
{
  "token": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
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

### POST /api/UserAuth/\_isLoggedIn

**Description:** Checks if a given authentication token represents a valid, active session.

**Requirements:**

* true

**Effects:**

* Returns `true` if `token` is a valid, active session token, `false` otherwise.

**Request Body:**

```json
{
  "token": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "loggedIn": "boolean"
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
