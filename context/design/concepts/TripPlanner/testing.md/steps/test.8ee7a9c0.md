---
timestamp: 'Sun Oct 12 2025 15:36:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_153605.7f376b84.md]]'
content_id: 8ee7a9c034a9d4bbbe51b9a6f7b05d551374d8200ee2a64565a2d9a73fc247a7
---

# test: LikertSurvey

Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:

* Create two trips for the same owner, destination, and dateRange (expect an error for the second).
* Add the same user twice to a trip (expect error thrown)
* Add a user to a trip that doesn’t exist (expect error).
* Non-owner trying to finalize a trip (expect error).

Please split these into separate tests.
