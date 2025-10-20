---
timestamp: 'Sun Oct 19 2025 18:01:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_180123.dd057880.md]]'
content_id: 64aaa7431b4a74ba4020691b4aaf09dc9f0137510f0d5aa3d2645089b521097a
---

# API Specification: TripPlanning Concept

**Purpose:** To allow users to create and manage trips, inviting collaborators to view and contribute to a shared trip plan.

***

## API Endpoints

### POST /api/TripPlanning/createTrip

**Description:** Creates a new trip with a name, description, owner, and date range.

**Requirements:**

* `name` is not empty.
* `startDate` is before or same as `endDate`.

**Effects:**

* A new Trip `t` is created with `name`, `description`, `owner`, `startDate`, `endDate`, and `createdAt`. `t` is returned as `trip`.

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "owner": "string",
  "startDate": "string",
  "endDate": "string"
}
```

**Success Response Body (Action):**

```json
{
  "trip": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripPlanning/addCollaborator

**Description:** Adds a user as a collaborator to an existing trip.

**Requirements:**

* `trip` exists.
* `user` is not already a collaborator or owner.

**Effects:**

* `user` is added to the `collaborators` set for `trip`.

**Request Body:**

```json
{
  "trip": "string",
  "user": "string"
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

### POST /api/TripPlanning/removeCollaborator

**Description:** Removes a user from the list of collaborators for a trip.

**Requirements:**

* `trip` exists.
* `user` is a collaborator (not the owner).

**Effects:**

* `user` is removed from the `collaborators` set for `trip`.

**Request Body:**

```json
{
  "trip": "string",
  "user": "string"
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

### POST /api/TripPlanning/updateTripDetails

**Description:** Updates the details (name, description, dates) of an existing trip.

**Requirements:**

* `trip` exists.
* If dates are provided, `startDate` is before or same as `endDate`.

**Effects:**

* The specified fields of `trip` are updated.

**Request Body:**

```json
{
  "trip": "string",
  "name": "string",
  "description": "string",
  "startDate": "string",
  "endDate": "string"
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

### POST /api/TripPlanning/deleteTrip

**Description:** Deletes an existing trip and all its associated data.

**Requirements:**

* `trip` exists.
* The caller is the owner.

**Effects:**

* The `trip` and all its associated data (from this concept) are removed.

**Request Body:**

```json
{
  "trip": "string"
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

### POST /api/TripPlanning/\_getTrip

**Description:** Retrieves the full details of a specific trip.

**Requirements:**

* `trip` exists.

**Effects:**

* Returns the full details of the specified `trip`.

**Request Body:**

```json
{
  "trip": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "owner": "string",
    "startDate": "string",
    "endDate": "string",
    "collaborators": [
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

### POST /api/TripPlanning/\_getTripsByUser

**Description:** Retrieves a list of trips where a user is either the owner or a collaborator.

**Requirements:**

* `user` exists.

**Effects:**

* Returns a list of trips where `user` is either the owner or a collaborator.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "owner": "string",
    "startDate": "string",
    "endDate": "string",
    "collaborators": [
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
