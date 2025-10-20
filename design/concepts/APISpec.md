[@api-extraction-from-code](../tools/api-extraction-from-code.md)
[@api-extraction-from-spec](../tools/api-extraction-from-spec.md)

Here are my concepts and their implementations:

CostSplitting:
[@cost-splitting-concept](../concepts/CostSplitting/CostSplitting.md)
[@cost-splitting-implementation](../../src/concepts/CostSplitting/CostSplittingConcept.ts)

PlanItinerary
[@itinerary-planning-concept](../concepts/ItineraryPlanner/PlanItinerary.md)
[@plan-itinerary-implementation](../../src/concepts/ItineraryPlanner/PlanItineraryConcept.ts)

PasswordAuth
[@password-auth-concept](../concepts/PasswordAuth/PasswordAuth.md)
[@password-auth-implementation](../../src/concepts/PasswordAuth/PasswordAuthConcept.ts)

Polling
[@polling-concept](../concepts/Polling/Polling.md)
[@polling-implementation](../../src/concepts/Polling/PollingConcept.ts)

TripPlanning
[@trip-planning-concept](../concepts/TripPlanner/TripPlanner.md)
[@trip-planning-implementation](../../src/concepts/TripPlanning/TripPlanningConcept.ts)

# response:

Here is the API Specification for the provided concepts, generated according to your instructions.

---

# API Specification: CostSplitting Concept

**Purpose:** Facilitate tracking, calculating, and settling of shared expenses and debts among multiple individuals.

---

## API Endpoints

### POST /api/CostSplitting/addExpense

**Description:** Records a new expense paid by one individual on behalf of others.

**Requirements:**
- `amount` > 0
- `owedBy` is not empty.

**Effects:**
- A new Expense `e` is created with `payer`, `description`, `amount`, `owedBy`, and `createdAt` set. `e` is returned as `expense`.

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

---

### POST /api/CostSplitting/settleDebt

**Description:** Records a settlement for a portion or full amount of debt from a payer to a payee.

**Requirements:**
- `payer` and `payee` exist.
- `payer` owes `payee` at least `amount`.

**Effects:**
- A new Settlement is recorded for `amount` from `payer` to `payee`.
- The outstanding debt between them is reduced by `amount`.

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

---

### POST /api/CostSplitting/_getExpenses

**Description:** Retrieves a list of all expenses, optionally filtered by the payer or a payee.

**Requirements:**
- true

**Effects:**
- Returns a list of all expenses, optionally filtered by `payer` (who paid) or `payee` (who owes).

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

---

### POST /api/CostSplitting/_getDebts

**Description:** Retrieves the total amount a specified payer owes to each payee.

**Requirements:**
- true

**Effects:**
- Returns the total amount `payer` owes to each `payee` as a list of debts. If no `payer` is specified, returns all outstanding debts.

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

---

### POST /api/CostSplitting/_getCreditors

**Description:** Retrieves the total amount each payer owes to a specified payee.

**Requirements:**
- true

**Effects:**
- Returns the total amount each `payer` owes to the specified `payee` as a list of creditors. If no `payee` is specified, returns all outstanding credits.

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

---

# API Specification: PlanItinerary Concept

**Purpose:** To enable users to collaboratively plan, organize, and manage itineraries for trips, including locations and activities.

---

## API Endpoints

### POST /api/PlanItinerary/createTrip

**Description:** Creates a new trip with a specified name, description, and owner.

**Requirements:**
- `name` is not empty.

**Effects:**
- A new Trip `t` is created with the given `name`, `description`, and `owner`. `t` is returned as `trip`.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "owner": "string"
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

---

### POST /api/PlanItinerary/addCollaborator

**Description:** Adds a user as a collaborator to an existing trip.

**Requirements:**
- `trip` exists.
- `user` is not already a collaborator or owner.

**Effects:**
- `user` is added to the `collaborators` set for `trip`.

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

---

### POST /api/PlanItinerary/addLocation

**Description:** Adds a new location to a trip's itinerary.

**Requirements:**
- `trip` exists.
- `arrivalDate` is before `departureDate`.

**Effects:**
- A new TripLocation `l` is created for `trip` with `locationName`, dates, and `order`. `l` is returned as `locationId`.

**Request Body:**
```json
{
  "trip": "string",
  "locationName": "string",
  "arrivalDate": "string",
  "departureDate": "string",
  "order": "number"
}
```

**Success Response Body (Action):**
```json
{
  "locationId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PlanItinerary/updateLocation

**Description:** Updates details for an existing location within a trip's itinerary.

**Requirements:**
- `locationId` exists.
- If dates are provided, `arrivalDate` is before `departureDate`.

**Effects:**
- The specified fields of the TripLocation `locationId` are updated.

**Request Body:**
```json
{
  "locationId": "string",
  "locationName": "string",
  "arrivalDate": "string",
  "departureDate": "string",
  "order": "number"
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

---

### POST /api/PlanItinerary/deleteLocation

**Description:** Deletes a location and all its associated activities from a trip.

**Requirements:**
- `locationId` exists.

**Effects:**
- The TripLocation `locationId` and all associated Activities are removed.

**Request Body:**
```json
{
  "locationId": "string"
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

---

### POST /api/PlanItinerary/addActivity

**Description:** Adds a new activity to a specific location within a trip's itinerary.

**Requirements:**
- `trip` and `tripLocation` exist.
- `startTime` is before `endTime`.

**Effects:**
- A new Activity `a` is created for `trip` and `tripLocation` with `name`, `description`, and times. `a` is returned as `activity`.

**Request Body:**
```json
{
  "trip": "string",
  "tripLocation": "string",
  "name": "string",
  "description": "string",
  "startTime": "string",
  "endTime": "string"
}
```

**Success Response Body (Action):**
```json
{
  "activity": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PlanItinerary/updateActivity

**Description:** Updates details for an existing activity.

**Requirements:**
- `activity` exists.
- If times are provided, `startTime` is before `endTime`.

**Effects:**
- The specified fields of the Activity `activity` are updated.

**Request Body:**
```json
{
  "activity": "string",
  "name": "string",
  "description": "string",
  "startTime": "string",
  "endTime": "string"
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

---

### POST /api/PlanItinerary/deleteActivity

**Description:** Deletes a specific activity.

**Requirements:**
- `activity` exists.

**Effects:**
- The Activity `activity` is removed.

**Request Body:**
```json
{
  "activity": "string"
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

---

### POST /api/PlanItinerary/_getTrips

**Description:** Retrieves a list of trips, optionally filtered by owner or collaborator.

**Requirements:**
- true

**Effects:**
- Returns a list of trips, optionally filtered by owner or collaborator.

**Request Body:**
```json
{
  "owner": "string",
  "collaborator": "string"
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
    "collaborators": [
      "string"
    ]
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PlanItinerary/_getLocationsForTrip

**Description:** Retrieves all locations for a given trip, ordered by their specified order.

**Requirements:**
- `trip` exists.

**Effects:**
- Returns all TripLocations for the given `trip`, ordered by `order`.

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
    "locationName": "string",
    "arrivalDate": "string",
    "departureDate": "string",
    "order": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PlanItinerary/_getActivitiesForLocation

**Description:** Retrieves all activities planned for a specific trip location.

**Requirements:**
- `tripLocation` exists.

**Effects:**
- Returns all Activities for the given `tripLocation`, ordered by `startTime`.

**Request Body:**
```json
{
  "tripLocation": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "startTime": "string",
    "endTime": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# API Specification: PasswordAuth Concept

**Purpose:** To provide secure user registration and authentication using usernames and passwords.

---

## API Endpoints

### POST /api/PasswordAuth/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**
- `username` is unique.
- `password` meets complexity requirements.

**Effects:**
- A new User `u` is created with `username`, `hashedPassword`, and `salt`. `u` is returned as `user`.

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

---

### POST /api/PasswordAuth/login

**Description:** Authenticates a user with provided username and password, returning an access token.

**Requirements:**
- `username` and `password` match an existing user.

**Effects:**
- A new Session `s` is created for the authenticated `user` with a `token` and `expiresAt`. `token` and `user` are returned.

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

---

### POST /api/PasswordAuth/logout

**Description:** Invalidates an active user session using its token.

**Requirements:**
- `token` is a valid, active session token.

**Effects:**
- The Session associated with `token` is invalidated/deleted.

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

---

### POST /api/PasswordAuth/changePassword

**Description:** Allows an authenticated user to change their password.

**Requirements:**
- `user` exists.
- `oldPassword` is correct.
- `newPassword` meets complexity requirements.

**Effects:**
- The `hashedPassword` and `salt` for `user` are updated with the `newPassword`.
- All active sessions for `user` are invalidated.

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

---

### POST /api/PasswordAuth/_getUserByToken

**Description:** Retrieves the user associated with a given authentication token.

**Requirements:**
- `token` is a valid, active session token.

**Effects:**
- Returns the `user` associated with the given `token`.

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

---

### POST /api/UserAuth/_isLoggedIn

**Description:** Checks if a given authentication token represents a valid, active session.

**Requirements:**
- true

**Effects:**
- Returns `true` if `token` is a valid, active session token, `false` otherwise.

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

---

# API Specification: Polling Concept

**Purpose:** To allow users to create polls with multiple options, cast votes, and view results.

---

## API Endpoints

### POST /api/Polling/createPoll

**Description:** Creates a new poll with a question, a set of options, and a creator.

**Requirements:**
- `question` is not empty.
- `options` contains at least two unique strings.

**Effects:**
- A new Poll `p` is created with `question`, `options` (each with 0 votes), `creator`, `createdAt`, and `isOpen` true. `p` is returned as `poll`.

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

---

### POST /api/Polling/vote

**Description:** Casts a vote for a specific option in an open poll by a user.

**Requirements:**
- `poll` exists and is open.
- `optionName` is one of the poll's options.
- `voter` has not already voted in this poll.

**Effects:**
- The vote count for `optionName` in `poll` is incremented.
- A new Vote is recorded for `voter` in `poll` for `optionName`.

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

---

### POST /api/Polling/closePoll

**Description:** Closes an open poll, preventing further votes from being cast.

**Requirements:**
- `poll` exists and is open.

**Effects:**
- The `isOpen` property of `poll` is set to `false`.
- No further votes can be cast for this poll.

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

---

### POST /api/Polling/_getPoll

**Description:** Retrieves the full details of a specific poll, including its current results.

**Requirements:**
- `poll` exists.

**Effects:**
- Returns the details of the specified `poll`, including its current results.

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

---

### POST /api/Polling/_getPollsByCreator

**Description:** Retrieves a list of polls created by a specific user.

**Requirements:**
- `creator` exists.

**Effects:**
- Returns a list of polls created by `creator`.

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

---

### POST /api/Polling/_getVote

**Description:** Retrieves the specific option a user voted for in a given poll.

**Requirements:**
- `poll` exists.
- `voter` has voted in `poll`.

**Effects:**
- Returns the `optionName` that `voter` chose in `poll`.

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

---

# API Specification: TripPlanning Concept

**Purpose:** To allow users to create and manage trips, inviting collaborators to view and contribute to a shared trip plan.

---

## API Endpoints

### POST /api/TripPlanning/createTrip

**Description:** Creates a new trip with a name, destination, owner, and date range.

**Requirements:**
- `name` is not empty.
- `startDate` is before or same as `endDate`.

**Effects:**
- A new Trip `t` is created with `name`, `destination`, `owner`, `startDate`, `endDate`, and `createdAt`. `t` is returned as `trip`.

**Request Body:**
```json
{
  "name": "string",
  "destination": "string",
  "owner": "string",
  "dateRange": {
    "start": "string",
    "end": "string"
  }
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

---

### POST /api/TripPlanning/addCollaborator

**Description:** Adds a user as a collaborator to an existing trip.

**Requirements:**
- `trip` exists.
- `user` is not already a collaborator or owner.

**Effects:**
- `user` is added to the `collaborators` set for `trip`.

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

---

### POST /api/TripPlanning/removeCollaborator

**Description:** Removes a user from the list of collaborators for a trip.

**Requirements:**
- `trip` exists.
- `user` is a collaborator (not the owner).

**Effects:**
- `user` is removed from the `collaborators` set for `trip`.

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

---

### POST /api/TripPlanning/updateTripDetails

**Description:** Updates the details (name, description, dates) of an existing trip.

**Requirements:**
- `trip` exists.
- If dates are provided, `startDate` is before or same as `endDate`.

**Effects:**
- The specified fields of `trip` are updated.

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

---

### POST /api/TripPlanning/deleteTrip

**Description:** Deletes an existing trip and all its associated data.

**Requirements:**
- `trip` exists.
- The caller is the owner.

**Effects:**
- The `trip` and all its associated data (from this concept) are removed.

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

---

### POST /api/TripPlanning/_getTrip

**Description:** Retrieves the full details of a specific trip.

**Requirements:**
- `trip` exists.

**Effects:**
- Returns the full details of the specified `trip`.

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

---

### POST /api/TripPlanning/_getTripsByUser

**Description:** Retrieves a list of trips where a user is either the owner or a collaborator.

**Requirements:**
- `user` exists.

**Effects:**
- Returns a list of trips where `user` is either the owner or a collaborator.

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
