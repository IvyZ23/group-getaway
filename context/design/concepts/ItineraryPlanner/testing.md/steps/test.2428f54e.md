---
timestamp: 'Sun Oct 12 2025 19:37:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_193725.3dfe0b8d.md]]'
content_id: 2428f54e94dd71bc3c74d76bcb125a87bd718ae45e06ee221a28f6dabc8f3f90
---

# test: LikertSurvey

Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:

* Attempt to create multiple itineraries for the same trip (should fail)
* Add an event to a non-existent itinerary (should fail)
* Approve an event that is already approved (should still work and idempotently not duplicate in ItineraryDoc.events)
* Attempt to add/update/approve/remove events after finalization (should not work)

Please split these into separate tests. Do not group them all together in one.
