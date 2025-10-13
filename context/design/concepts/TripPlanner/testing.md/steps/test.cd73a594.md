---
timestamp: 'Sun Oct 12 2025 15:33:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_153351.74cc15d1.md]]'
content_id: cd73a5942e49f72814b230b96421dc431c4c50d5f8fab2f9543de83fb57134e7
---

# test: LikertSurvey

Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:

* Create two trips for the same owner, destination, and dateRange (expect an error for the second).
* Add the same user twice to a trip (expect error thrown)
* Add a user to a trip that doesn’t exist (expect error).
* Non-owner trying to finalize a trip (expect error).
