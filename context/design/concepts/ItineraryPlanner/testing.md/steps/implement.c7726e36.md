---
timestamp: 'Sun Oct 12 2025 19:37:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_193725.3dfe0b8d.md]]'
content_id: c7726e3610a89ce78d831be21d42c447b191a1e8bf21efa0e6b16b88dc405f3b
---

# implement: PlanItinerary

**concept** PlanItinerary \[Trip]

**purpose** allow for easier itinerary crafting between multiple people

**principle** an itinerary is created for a trip. Users can add and remove events from
the intinerary. Added events await approval before being offically added. If it is not
approved, it will not be added to the itinerary.

**state**

a set of Itineraries with

* a trip Trip
* a set of Events
* a finalized Flag

a set of Events with

* a name String
* a cost Number
* a pending Flag
* an approved Flag

**action**

create(trip:Trip): Itinerary

* **requires** itinerary for trip to not already exist
* **effects** creates new itinerary for trip

addEvent(name: String, cost: Number, itinerary: Itinerary)

* **effects** add new pending event to the itinerary

updateEvent(event: Event, name: String, cost: Number, itinerary: Itinerary)

* **requires** event in itinerary to exist
* **effects** updates event

approveEvent(event: Event, approved: Flag, itinerary: Itinerary)

* **requires** event to exist in itinerary
* **effects** sets approval flag for itinerary and update pending to false

finalizeItinerary(intinerary: Itinerary, finalized: Flag)

* **requires** itinerary to exist
* **effects** sets itinerary finalized to given flag
