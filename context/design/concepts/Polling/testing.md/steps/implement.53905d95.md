---
timestamp: 'Mon Oct 13 2025 00:59:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_005903.588ec1e9.md]]'
content_id: 53905d9592f5e0b47a1edc05cc39078b476986fcdb74196da6039011bb8a1fff
---

# implement: Polling

**concept** Polling \[User, Option]

**purpose** use majority vote to make a decision

**principle** a user creates a poll and adds or removed options to it.
They add and remove users to the poll. The users can vote on the options. Once the
poll is closed, the result is finalized.

**state**

a set of Polls with

* a name String
* a set of Users
* a set of Options
* a creator User
* a set of Votes
* a closed Flag

a set of Options with

* an option Option

a set of Votes with

* a user User
* a vote Option

**actions**

create(user: User, name: String): Poll

* **requires** a poll under the user with the same name not to already exist
* **effects** creates new poll

addOption(poll: Poll, option: Option)

* **requires** option to not already exist in poll
* **effects** adds option to poll

removeOption(poll: Poll, option: Option)

* **requires** option to exist in poll
* **effects** removes option from poll

addUser(user)

* **requires** user to not already be added to poll
* **effects** adds user to poll

removeUser(user)

* **requires** user to already be added to poll
* **effects** removes user from poll

addVote(user: User, vote: Option, poll: Poll)

* **requires** user and option to exist in poll and poll to not be closed
* **effects** adds new vote to poll

updateVote(user: User, new: Option, poll: Poll)

* **requires** user's vote to exist in poll and poll to not be closed
* **effects** updates the user's vote with new option

close(user: User, poll: Poll)

* **requires** poll to exist and the user to be the owner
* **effects** closes poll

getResult(poll: Poll): Option

* **requires** poll to exist
* **effects** returns the highest voted option
