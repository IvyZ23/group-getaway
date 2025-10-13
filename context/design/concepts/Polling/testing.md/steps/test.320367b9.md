---
timestamp: 'Mon Oct 13 2025 00:59:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_005903.588ec1e9.md]]'
content_id: 320367b93cfd661a8a9964ae3c1507e292e96df417849daf358c6dc74a03d8de
---

# test: Polling

Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:

* Adding the same option added twice (should fail)
* Adding or removing an option after the poll has been closed (should fail)
* Removing an option with votes on it (should remove the votes)
* Adding a user who already exists (should fail)
* User who is not in poll voting (should fail)
* Voting or removing votes after the poll has been closed (should fail)

Keep these as separate tests in the same file.
