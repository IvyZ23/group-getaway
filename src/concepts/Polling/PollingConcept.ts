import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Polling" + ".";

type User = ID;
type Option = ID;
type Poll = ID;

interface OptionDoc {
  _id: Option;
  label: string;
}

interface VoteDoc {
  userId: User;
  optionId: Option;
}

interface PollDoc {
  _id: Poll;
  name: string;
  users: User[];
  options: OptionDoc[];
  votes: VoteDoc[];
  creator: User;
  closed: boolean;
}

export default class PollingConcept {
  private polls: Collection<PollDoc>;

  constructor(private readonly db: Db) {
    this.polls = this.db.collection(PREFIX + "polls");
  }

  // --- Core functionality ---

  async create(
    { user, name }: { user: User; name: string },
  ): Promise<{ poll: Poll } | { error: string }> {
    const existingPoll = await this.polls.findOne({ creator: user, name });
    if (existingPoll) {
      return { error: "A poll with this name already exists for this user." };
    }

    const newPollId = freshID();
    const result = await this.polls.insertOne({
      _id: newPollId,
      name,
      users: [user],
      options: [],
      votes: [],
      creator: user,
      closed: false,
    });

    if (!result.acknowledged) return { error: "Failed to create poll." };
    return { poll: newPollId };
  }

  async addOption(
    { actingUser, poll, label }: {
      actingUser: User;
      poll: Poll;
      label: string;
    },
  ): Promise<Empty | { error: string }> {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) return { error: "Poll not found." };
    if (existingPoll.creator !== actingUser) {
      return { error: "Only the poll creator can add options." };
    }
    console.log(existingPoll, "poll");
    if (existingPoll.closed) {
      return { error: "Cannot add option to a closed poll." };
    }

    if (existingPoll.options.some((o) => o.label === label)) {
      return { error: "Option with this label already exists." };
    }

    const newOption: OptionDoc = { _id: freshID() as Option, label };

    const result = await this.polls.updateOne(
      { _id: poll },
      { $push: { options: newOption } },
    );
    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }
    console.log(result);

    return {};
  }

  async removeOption(
    { actingUser, poll, optionId }: {
      actingUser: User;
      poll: Poll;
      optionId: Option;
    },
  ): Promise<Empty | { error: string }> {
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) return { error: "Poll not found." };
    if (existingPoll.creator !== actingUser) {
      return { error: "Only the poll creator can remove options." };
    }
    if (existingPoll.closed) {
      return { error: "Cannot remove option from a closed poll." };
    }
    if (!existingPoll.options.some((o) => o._id === optionId)) {
      return { error: "Option not found." };
    }

    await this.polls.updateOne(
      { _id: poll },
      {
        $pull: {
          options: { _id: optionId },
          votes: { optionId },
        },
      },
    );

    return {};
  }

  async addUser(
    { actingUser, poll, userToAdd }: {
      actingUser: User;
      poll: Poll;
      userToAdd: User;
    },
  ): Promise<Empty | { error: string }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { error: "Poll not found." };
    if (pollDoc.creator !== actingUser) {
      return { error: "Only the poll creator can add users." };
    }
    if (pollDoc.closed) {
      return { error: "Cannot add user to a closed poll." };
    }
    if (pollDoc.users.includes(userToAdd)) {
      return { error: "User already in poll." };
    }

    await this.polls.updateOne(
      { _id: poll },
      { $addToSet: { users: userToAdd } },
    );
    return {};
  }

  /**
   * removeUser(actingUser: User, poll: Poll, userToRemove: User)
   * requires: poll to exist, actingUser to be the creator, poll not to be closed, userToRemove to already be added to poll, and userToRemove not to be the creator.
   * effects: removes userToRemove from poll and any votes by that user in that poll
   */
  async removeUser(
    { actingUser, poll, userToRemove }: {
      actingUser: User;
      poll: Poll;
      userToRemove: User;
    },
  ): Promise<Empty | { error: string }> {
    // Find poll
    const existingPoll = await this.polls.findOne({ _id: poll });
    if (!existingPoll) {
      return { error: "Poll not found." };
    }

    // Authorization: only creator can remove
    if (existingPoll.creator !== actingUser) {
      return { error: "Only the poll creator can remove users." };
    }

    // Cannot modify closed poll
    if (existingPoll.closed) {
      return { error: "Cannot remove user from a closed poll." };
    }

    // Check user participation
    if (!existingPoll.users.includes(userToRemove)) {
      return { error: "User is not participating in this poll." };
    }

    // Creator cannot be removed
    if (existingPoll.creator === userToRemove) {
      return { error: "Cannot remove the poll creator." };
    }

    // Remove user from list and delete any of their votes
    const updatedUsers = existingPoll.users.filter((u) => u !== userToRemove);
    const updatedVotes = existingPoll.votes.filter(
      (v) => v.userId !== userToRemove,
    );

    const result = await this.polls.updateOne(
      { _id: poll },
      { $set: { users: updatedUsers, votes: updatedVotes } },
    );

    if (result.matchedCount === 0) {
      return { error: "Poll not found or not updated." };
    }

    return {};
  }

  async addVote(
    { user, optionId, poll }: {
      user: User;
      optionId: Option;
      poll: Poll;
    },
  ): Promise<Empty | { error: string }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { error: "Poll not found." };
    if (pollDoc.closed) return { error: "Poll is closed." };
    if (!pollDoc.users.includes(user)) {
      return { error: "User not part of this poll." };
    }
    if (!pollDoc.options.some((o) => o._id === optionId)) {
      return { error: "Option does not exist." };
    }

    if (pollDoc.votes.some((v) => v.userId === user)) {
      return { error: "User already voted." };
    }

    const newVote: VoteDoc = { userId: user, optionId };
    await this.polls.updateOne({ _id: poll }, { $push: { votes: newVote } });
    return {};
  }

  async updateVote(
    { user, newOption, poll }: {
      user: User;
      newOption: Option;
      poll: Poll;
    },
  ): Promise<Empty | { error: string }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { error: "Poll not found." };
    if (pollDoc.closed) return { error: "Poll is closed." };
    if (!pollDoc.options.some((o) => o._id === newOption)) {
      return { error: "Option does not exist." };
    }

    const voteIndex = pollDoc.votes.findIndex((v) => v.userId === user);
    if (voteIndex === -1) return { error: "User has not voted." };

    pollDoc.votes[voteIndex].optionId = newOption;
    await this.polls.updateOne({ _id: poll }, {
      $set: { votes: pollDoc.votes },
    });
    return {};
  }

  async close(
    { actingUser, poll }: { actingUser: User; poll: Poll },
  ): Promise<Empty | { error: string }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { error: "Poll not found." };
    if (pollDoc.creator !== actingUser) {
      return { error: "Only the poll creator can close the poll." };
    }
    if (pollDoc.closed) return { error: "Poll already closed." };

    await this.polls.updateOne({ _id: poll }, { $set: { closed: true } });
    return {};
  }

  async getResult(
    { poll }: { poll: Poll },
  ): Promise<{ option: Option | null } | { error: string }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { error: "Poll not found." };
    if (pollDoc.votes.length === 0) return { option: null };

    const counts: Record<string, number> = {};
    for (const vote of pollDoc.votes) {
      counts[vote.optionId] = (counts[vote.optionId] || 0) + 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { option: (sorted[0]?.[0] as Option) ?? null };
  }

  // --- Queries ---

  async _getPoll(
    { poll }: { poll: Poll },
  ): Promise<{ poll: PollDoc | null }> {
    const pollDoc = await this.polls.findOne({ name: poll });
    console.log(pollDoc, poll);
    return { poll: pollDoc };
  }

  async _getUserVote(
    { poll, user }: { poll: Poll; user: User },
  ): Promise<{ vote: VoteDoc | null }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    if (!pollDoc) return { vote: null };
    const vote = pollDoc.votes.find((v) => v.userId === user) ?? null;
    return { vote };
  }

  async _getVotesForPoll(
    { poll }: { poll: Poll },
  ): Promise<{ votes: VoteDoc[] }> {
    const pollDoc = await this.polls.findOne({ _id: poll });
    return { votes: pollDoc?.votes ?? [] };
  }
}
