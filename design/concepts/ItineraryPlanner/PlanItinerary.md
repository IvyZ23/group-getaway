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

-   **requires** itinerary to not be finalized
-   **effects** add new pending event to the itinerary

updateEvent(event: Event, name: String, cost: Number, itinerary: Itinerary)

-   **requires** event in itinerary to exist and  itinerary to not be finalized
-   **effects** updates event

approveEvent(event: Event, approved: Flag, itinerary: Itinerary)

-   **requires** event to exist in itinerary and itinerary to not be finalized
-   **effects** sets approval flag for itinerary and update pending to false

finalizeItinerary(itinerary: Itinerary, finalized: Flag)

-   **requires** itinerary to exist
-   **effects** sets itinerary finalized to given flag
