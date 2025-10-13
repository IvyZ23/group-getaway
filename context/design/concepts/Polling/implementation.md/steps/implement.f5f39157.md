---
timestamp: 'Mon Oct 13 2025 01:06:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_010623.b557959a.md]]'
content_id: f5f391577405f054469a0791e518c58850972c8ed01eb8cbcb83d8889089c7a6
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

Can you update the implementation of this so that it checks if the user who are doing the actions of adding and removing users and options and closing the poll is the creator of the poll?

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * PollingConcept
 * purpose: use majority vote to make a decision
 */
const PREFIX = "Polling" + ".";

// Generic types of this concept
type User = ID;
type Option = ID;
type Poll = ID; // The ID of a specific poll

/**
 * a set of Polls with
 *   a name String
 *   a set of Users (participating in the poll)
 *   a set of Options (available for voting)
 *   a creator User
 *   a closed Flag
 */
interface PollDoc {
  _id: Poll;
  name: string;
  users: User[]; // Users participating in this poll
  options: Option[]; // Options available in this poll
  creator: User;
  closed: boolean;
}

/**
 * a set of Votes with
 *   a poll ID
 *   a user User
 *   a vote Option
 */
interface VoteDoc {
  _id: ID; // Unique ID for the vote record
  pollId: Poll;
  userId: User;
  optionId: Option;
}

export default class PollingConcept {
  private polls: Collection<PollDoc>;
  private votes: Collection<VoteDoc>;

  constructor(private readonly db: Db) {
    this.polls = this.db.collection(PREFIX + "polls");
    this.votes = this.db.collection(PREFIX + "votes");
  }

  /**
   * create(user: User, name: String): Poll
   * requires: a poll under the user with the same name not to already exist
   * effects: creates new poll
   */
  async create({ user, name }: { user: User; name: string }): Promise<
    { poll: Poll } | { error: string }
  > {
    // Check requires: a poll under the user with the same name not to already exist
    const existingPoll = await this.polls.findOne({
      creator: user,
      name: name,
    });
    if (existingPoll) {
      return { error: "A poll with this name already exists for this user." };
    }

    // effects: creates new poll
    const newPollId = freshID();
    const result = await this.polls.insertOne({
      _id: newPollId,
      name,
      users: [user], // Creator is automatically a user in the poll
      options: [],
      creator: user,
      closed: false,
    });

    if (!result.acknowledged) {
      return { error: "Failed to create poll." };
    }

    return { poll: newPollId };
  }

  /**
   * addOption(poll: Poll, option: Option)
   * requires: poll to exist and option to not already exist in poll's options
   * effects: adds option to poll
   */
  async addOption({ poll, option }: { poll: Poll; option: Option }): Promise<
    Empty | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot add option to a closed poll." };
    }
    if (existingPoll.options.includes(option)) {
      return { error: "Option already exists in this poll." };
    }

    const result = await this.polls.updateOne(
      { _id: poll },
      { $addToSet: { options: option } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }
    return {};
  }

  /**
   * removeOption(poll: Poll, option: Option)
   * requires: poll to exist and option to exist in poll's options
   * effects: removes option from poll and any votes for that option in that poll
   */
  async removeOption({ poll, option }: { poll: Poll; option: Option }): Promise<
    Empty | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot remove option from a closed poll." };
    }
    if (!existingPoll.options.includes(option)) {
      return { error: "Option does not exist in this poll." };
    }

    const result = await this.polls.updateOne(
      { _id: poll },
      { $pull: { options: option } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }

    // Also remove any votes associated with this option for this poll
    await this.votes.deleteMany({ pollId: poll, optionId: option });

    return {};
  }

  /**
   * addUser(poll: Poll, user: User)
   * requires: poll to exist and user to not already be added to poll
   * effects: adds user to poll
   */
  async addUser({ poll, user }: { poll: Poll; user: User }): Promise<
    Empty | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot add user to a closed poll." };
    }
    if (existingPoll.users.includes(user)) {
      return { error: "User already participating in this poll." };
    }

    const result = await this.polls.updateOne(
      { _id: poll },
      { $addToSet: { users: user } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }
    return {};
  }

  /**
   * removeUser(poll: Poll, user: User)
   * requires: poll to exist and user to already be added to poll
   * effects: removes user from poll and any votes by that user in that poll
   */
  async removeUser({ poll, user }: { poll: Poll; user: User }): Promise<
    Empty | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot remove user from a closed poll." };
    }
    if (!existingPoll.users.includes(user)) {
      return { error: "User is not participating in this poll." };
    }
    if (existingPoll.creator === user) {
      return { error: "Cannot remove the poll creator." };
    }

    const result = await this.polls.updateOne(
      { _id: poll },
      { $pull: { users: user } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }

    // Also remove any votes associated with this user for this poll
    await this.votes.deleteMany({ pollId: poll, userId: user });

    return {};
  }

  /**
   * addVote(user: User, vote: Option, poll: Poll)
   * requires: poll to exist, user to be in poll's users, vote option to be in poll's options,
   *           poll not to be closed, and user not to have already voted in this poll
   * effects: adds new vote to poll
   */
  async addVote(
    { user, option, poll }: { user: User; option: Option; poll: Poll },
  ): Promise<Empty | { error: string }> {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot vote on a closed poll." };
    }
    if (!existingPoll.users.includes(user)) {
      return { error: "User is not a participant in this poll." };
    }
    if (!existingPoll.options.includes(option)) {
      return { error: "Option does not exist in this poll." };
    }

    // Check if user has already voted
    const existingVote = await this.votes.findOne({
      pollId: poll,
      userId: user,
    });
    if (existingVote) {
      return {
        error: "User has already voted. Use updateVote to change your vote.",
      };
    }

    const newVoteId = freshID();
    const result = await this.votes.insertOne({
      _id: newVoteId,
      pollId: poll,
      userId: user,
      optionId: option,
    });

    if (!result.acknowledged) {
      return { error: "Failed to add vote." };
    }

    return {};
  }

  /**
   * updateVote(user: User, newOption: Option, poll: Poll)
   * requires: poll to exist, user's vote to exist in poll, newOption to exist in poll's options,
   *           and poll not to be closed
   * effects: updates the user's vote with new option
   */
  async updateVote(
    { user, newOption, poll }: { user: User; newOption: Option; poll: Poll },
  ): Promise<Empty | { error: string }> {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot update vote on a closed poll." };
    }
    if (!existingPoll.users.includes(user)) {
      return { error: "User is not a participant in this poll." };
    }
    if (!existingPoll.options.includes(newOption)) {
      return { error: "New option does not exist in this poll." };
    }

    // Check if user has an existing vote
    const existingVote = await this.votes.findOne({
      pollId: poll,
      userId: user,
    });
    if (!existingVote) {
      return {
        error: "User has not voted yet. Use addVote to cast a new vote.",
      };
    }

    const result = await this.votes.updateOne(
      { _id: existingVote._id },
      { $set: { optionId: newOption } },
    );

    if (result.matchedCount === 0) {
      return { error: "Vote not found or not updated." };
    }
    return {};
  }

  /**
   * close(user: User, poll: Poll)
   * requires: poll to exist and the user to be the creator
   * effects: closes poll
   */
  async close({ user, poll }: { user: User; poll: Poll }): Promise<
    Empty | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }
    if (existingPoll.creator !== user) {
      return { error: "Only the poll creator can close the poll." };
    }
    if (existingPoll.closed) {
      return { error: "Poll is already closed." };
    }

    const result = await this.polls.updateOne(
      { _id: poll },
      { $set: { closed: true } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }
    return {};
  }

  /**
   * getResult(poll: Poll): Option
   * requires: poll to exist
   * effects: returns the highest voted option (or null if no votes or options)
   */
  async getResult({ poll }: { poll: Poll }): Promise<
    { option: Option | null } | { error: string }
  > {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }

    // Aggregation pipeline to count votes for each option
    const aggregationResult = await this.votes.aggregate<
      { _id: Option; count: number }
    >([
      { $match: { pollId: poll } },
      { $group: { _id: "$optionId", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // Sort by count in descending order
      { $limit: 1 }, // Get the option with the highest count
    ]).toArray();

    if (aggregationResult.length > 0) {
      return { option: aggregationResult[0]._id };
    } else {
      // No votes, or no options with votes.
      return { option: null };
    }
  }

  // --- Query methods ---

  /**
   * _getPoll(poll: Poll)
   * Returns details of a specific poll.
   */
  async _getPoll({ poll }: { poll: Poll }): Promise<
    { poll: PollDoc | null } | { error: string }
  > {
    const pollDoc = await this.polls.findOne({ _id: poll });
    return { poll: pollDoc };
  }

  /**
   * _getVotesForPoll(poll: Poll)
   * Returns all votes for a specific poll.
   */
  async _getVotesForPoll({ poll }: { poll: Poll }): Promise<
    { votes: VoteDoc[] } | { error: string }
  > {
    const votes = await this.votes.find({ pollId: poll }).toArray();
    return { votes: votes };
  }

  /**
   * _getUserVote(poll: Poll, user: User)
   * Returns a specific user's vote in a poll.
   */
  async _getUserVote({ poll, user }: { poll: Poll; user: User }): Promise<
    { vote: VoteDoc | null } | { error: string }
  > {
    const vote = await this.votes.findOne({ pollId: poll, userId: user });
    return { vote: vote };
  }
}

```
