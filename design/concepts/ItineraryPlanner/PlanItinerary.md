**concept** PlanItinerary [Trip, Event]

**purpose** allow for easier itinerary crafting between multiple people

**principle** an itinerary is created for a trip. Users can add and remove events from
the itinerary. Added events await approval before being offically added. If it is not
approved, it will not be added to the itinerary.

**state**

a set of Itineraries with

-   a trip Trip
-   a set of Events
-   a finalized Flag

a set of Events with

-   a name String
-   a cost Number
-   a pending Flag
-   an approved Flag

**action**

create(trip:Trip): Itinerary

-   **requires** itinerary for trip to not already exist
-   **effects** creates new itinerary for trip

addEvent(name: String, cost: Number, itinerary: Itinerary)

- **requires** itinerary to exist and not be finalized
- **effects** creates a new Event in a pending state. The Event is not added to the itinerary's official `events` array until it is approved.

updateEvent(event: Event, name: String, cost: Number, itinerary: Itinerary)

- **requires** event in itinerary to exist and itinerary to not be finalized
- **effects** updates the event's name and cost; does not change approval/pending status

approveEvent(event: Event, approved: Flag, itinerary: Itinerary)

- **requires** event to exist in itinerary and itinerary to not be finalized
- **effects** sets the event's `approved` flag and sets `pending` to false. If `approved` is true the event ID is added to the itinerary's official `events` list (if not already present). If `approved` is false the event is removed from the itinerary's `events` list.

removeEvent(event: Event, itinerary: Itinerary)

- **requires** event to exist in itinerary and itinerary to not be finalized
- **effects** deletes the event record and removes its ID from the itinerary's `events` list if present

finalizeItinerary(itinerary: Itinerary, finalized: Flag)

-   **requires** itinerary to exist
-   **effects** sets itinerary finalized to given flag
