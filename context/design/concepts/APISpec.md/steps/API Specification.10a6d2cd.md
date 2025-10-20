---
timestamp: 'Sun Oct 19 2025 18:01:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251019_180123.dd057880.md]]'
content_id: 10a6d2cddef8b40d8dcdda8709ed4fa8140335c5ecdb468c65b6c1db0e450339
---

# API Specification: PlanItinerary Concept

**Purpose:** To enable users to collaboratively plan, organize, and manage itineraries for trips, including locations and activities.

***

## API Endpoints

### POST /api/PlanItinerary/createTrip

**Description:** Creates a new trip with a specified name, description, and owner.

**Requirements:**

* `name` is not empty.

**Effects:**

* A new Trip `t` is created with the given `name`, `description`, and `owner`. `t` is returned as `trip`.

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

***

### POST /api/PlanItinerary/addCollaborator

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

### POST /api/PlanItinerary/addLocation

**Description:** Adds a new location to a trip's itinerary.

**Requirements:**

* `trip` exists.
* `arrivalDate` is before `departureDate`.

**Effects:**

* A new TripLocation `l` is created for `trip` with `locationName`, dates, and `order`. `l` is returned as `locationId`.

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

***

### POST /api/PlanItinerary/updateLocation

**Description:** Updates details for an existing location within a trip's itinerary.

**Requirements:**

* `locationId` exists.
* If dates are provided, `arrivalDate` is before `departureDate`.

**Effects:**

* The specified fields of the TripLocation `locationId` are updated.

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

***

### POST /api/PlanItinerary/deleteLocation

**Description:** Deletes a location and all its associated activities from a trip.

**Requirements:**

* `locationId` exists.

**Effects:**

* The TripLocation `locationId` and all associated Activities are removed.

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

***

### POST /api/PlanItinerary/addActivity

**Description:** Adds a new activity to a specific location within a trip's itinerary.

**Requirements:**

* `trip` and `tripLocation` exist.
* `startTime` is before `endTime`.

**Effects:**

* A new Activity `a` is created for `trip` and `tripLocation` with `name`, `description`, and times. `a` is returned as `activity`.

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

***

### POST /api/PlanItinerary/updateActivity

**Description:** Updates details for an existing activity.

**Requirements:**

* `activity` exists.
* If times are provided, `startTime` is before `endTime`.

**Effects:**

* The specified fields of the Activity `activity` are updated.

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

***

### POST /api/PlanItinerary/deleteActivity

**Description:** Deletes a specific activity.

**Requirements:**

* `activity` exists.

**Effects:**

* The Activity `activity` is removed.

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

***

### POST /api/PlanItinerary/\_getTrips

**Description:** Retrieves a list of trips, optionally filtered by owner or collaborator.

**Requirements:**

* true

**Effects:**

* Returns a list of trips, optionally filtered by owner or collaborator.

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

***

### POST /api/PlanItinerary/\_getLocationsForTrip

**Description:** Retrieves all locations for a given trip, ordered by their specified order.

**Requirements:**

* `trip` exists.

**Effects:**

* Returns all TripLocations for the given `trip`, ordered by `order`.

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

***

### POST /api/PlanItinerary/\_getActivitiesForLocation

**Description:** Retrieves all activities planned for a specific trip location.

**Requirements:**

* `tripLocation` exists.

**Effects:**

* Returns all Activities for the given `tripLocation`, ordered by `startTime`.

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

***
