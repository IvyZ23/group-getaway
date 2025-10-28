**concept** Polling [User, Option]

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

*   **requires** a poll under the user with the same name not to already exist
*   **effects** creates new poll

addOption(actingUser: User, poll: Poll, option: Option)

*   **requires** poll to exist, actingUser to be the creator, poll not to be closed, and option to not already exist in poll's options
*   **effects** adds option to poll

removeOption(actingUser: User, poll: Poll, option: Option)

*   **requires** poll to exist, actingUser to be the creator, poll not to be closed, and option to exist in poll's options
*   **effects** removes option from poll and any votes for that option in that poll

addUser(actingUser: User, poll: Poll, userToAdd: User)

- **requires** poll to exist and poll not to be closed. (Implementation does not strictly require actingUser to be the creator; caller authorization is handled by the caller/front-end or higher-level flow.)
- **effects** adds `userToAdd` to the poll's participant list if not present

removeUser(actingUser: User, poll: Poll, userToRemove: User)

*   **requires** poll to exist, actingUser to be the creator, poll not to be closed, userToRemove to already be added to poll, and userToRemove not to be the creator.
*   **effects** removes userToRemove from poll and any votes by that user in that poll

addVote(user: User, option: Option, poll: Poll)

*   **requires** poll to exist, user to be in poll's users, option to be in poll's options, and poll not to be closed
*   **effects** adds new vote to poll

updateVote(user: User, newOption: Option, poll: Poll)

*   **requires** poll to exist, user's vote to exist in poll, newOption to exist in poll's options, and poll not to be closed
*   **effects** updates the user's vote with new option

close(actingUser: User, poll: Poll)

- **requires** poll to exist and the actingUser to be the creator
- **effects** sets the poll's `closed` flag to true; no further votes or modifications allowed

getResult(poll: Poll): Option | null

- **requires** poll to exist
- **effects** returns the option id with the most votes, or `null` if no votes have been cast

**queries**

_getPoll(poll: Poll) -> PollDoc | null

- **effects** returns the full poll document; supports lookup by id or (legacy) by name

_getUserVote(poll: Poll, user: User) -> VoteDoc | null

- **effects** returns the vote record for the user in the poll, or null

_getVotesForPoll(poll: Poll) -> VoteDoc[]

- **effects** returns the array of votes for the poll
