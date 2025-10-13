---
timestamp: 'Mon Oct 13 2025 01:07:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_010704.9b2859c3.md]]'
content_id: 3ea80c91bcee7b0f24246e08c1ba2aae18ac7814d0bb17986fbc140b8123807f
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

addOption(actingUser: User, poll: Poll, option: Option)

* **requires** poll to exist, `actingUser` to be the creator, poll not to be closed, and `option` to not already exist in poll's options
* **effects** adds option to poll

removeOption(actingUser: User, poll: Poll, option: Option)

* **requires** poll to exist, `actingUser` to be the creator, poll not to be closed, and `option` to exist in poll's options
* **effects** removes option from poll and any votes for that option in that poll

addUser(actingUser: User, poll: Poll, userToAdd: User)

* **requires** poll to exist, `actingUser` to be the creator, poll not to be closed, and `userToAdd` to not already be added to poll
* **effects** adds `userToAdd` to poll

removeUser(actingUser: User, poll: Poll, userToRemove: User)

* **requires** poll to exist, `actingUser` to be the creator, poll not to be closed, `userToRemove` to already be added to poll, and `userToRemove` not to be the creator.
* **effects** removes `userToRemove` from poll and any votes by that user in that poll

addVote(user: User, option: Option, poll: Poll)

* **requires** poll to exist, user to be in poll's users, option to be in poll's options, and poll not to be closed
* **effects** adds new vote to poll

updateVote(user: User, newOption: Option, poll: Poll)

* **requires** poll to exist, user's vote to exist in poll, `newOption` to exist in poll's options, and poll not to be closed
* **effects** updates the user's vote with new option

close(actingUser: User, poll: Poll)

* **requires** poll to exist and the `actingUser` to be the creator
* **effects** closes poll

getResult(poll: Poll): Option

* **requires** poll to exist
* **effects** returns the highest voted option

***
