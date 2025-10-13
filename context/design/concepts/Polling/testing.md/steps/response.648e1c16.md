---
timestamp: 'Mon Oct 13 2025 00:59:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_005923.541b4429.md]]'
content_id: 648e1c1626831a7c2c81278699a13a6fff8a36d325de14099b55d3797ce7c007
---

# response:

```typescript
// file: src/polling/PollingConcept.test.ts
import { assertEquals, assertNotEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PollingConcept from "./PollingConcept.ts";

Deno.test("PollingConcept", async (t) => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  // Define some test users and options
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCarol = "user:Carol" as ID;

  const optionA = "option:Pizza" as ID;
  const optionB = "option:Burgers" as ID;
  const optionC = "option:Salad" as ID;

  await t.step("trace: Operational Principle fulfillment", async () => {
    // principle: a user creates a poll and adds or removed options to it.
    // They add and remove users to the poll. The users can vote on the options.
    // Once the poll is closed, the result is finalized.

    // 1. User Alice creates a poll
    const createResult = await pollingConcept.create({ user: userAlice, name: "Lunch Choices" });
    assertExists((createResult as { poll: Poll }).poll);
    const pollId = (createResult as { poll: Poll }).poll;
    assertEquals(typeof pollId, "string");

    // Verify poll exists and is created by Alice
    const getPollBeforeOptions = await pollingConcept._getPoll({ poll: pollId });
    assertExists(getPollBeforeOptions.poll);
    assertEquals(getPollBeforeOptions.poll!.name, "Lunch Choices");
    assertEquals(getPollBeforeOptions.poll!.creator, userAlice);
    assertEquals(getPollBeforeOptions.poll!.closed, false);
    assertObjectMatch(getPollBeforeOptions.poll!, { users: [userAlice], options: [] });

    // 2. Alice adds options
    assertEquals(await pollingConcept.addOption({ poll: pollId, option: optionA }), {});
    assertEquals(await pollingConcept.addOption({ poll: pollId, option: optionB }), {});
    assertEquals(await pollingConcept.addOption({ poll: pollId, option: optionC }), {});

    // Verify options are added
    const getPollWithOptions = await pollingConcept._getPoll({ poll: pollId });
    assertExists(getPollWithOptions.poll);
    assertObjectMatch(getPollWithOptions.poll!, { options: [optionA, optionB, optionC] });

    // 3. Alice adds Bob and Carol as participants
    assertEquals(await pollingConcept.addUser({ poll: pollId, user: userBob }), {});
    assertEquals(await pollingConcept.addUser({ poll: pollId, user: userCarol }), {});

    // Verify users are added
    const getPollWithUsers = await pollingConcept._getPoll({ poll: pollId });
    assertExists(getPollWithUsers.poll);
    assertObjectMatch(getPollWithUsers.poll!, { users: [userAlice, userBob, userCarol] });

    // 4. The users can vote on the options.
    // Alice votes for Pizza
    assertEquals(await pollingConcept.addVote({ user: userAlice, option: optionA, poll: pollId }), {});
    // Bob votes for Pizza
    assertEquals(await pollingConcept.addVote({ user: userBob, option: optionA, poll: pollId }), {});
    // Carol votes for Burgers
    assertEquals(await pollingConcept.addVote({ user: userCarol, option: optionB, poll: pollId }), {});

    // Verify votes are cast
    const aliceVote = await pollingConcept._getUserVote({ poll: pollId, user: userAlice });
    assertExists(aliceVote.vote);
    assertEquals(aliceVote.vote!.optionId, optionA);

    const bobVote = await pollingConcept._getUserVote({ poll: pollId, user: userBob });
    assertExists(bobVote.vote);
    assertEquals(bobVote.vote!.optionId, optionA);

    const carolVote = await pollingConcept._getUserVote({ poll: pollId, user: userCarol });
    assertExists(carolVote.vote);
    assertEquals(carolVote.vote!.optionId, optionB);

    // 5. Once the poll is closed, the result is finalized.
    assertEquals(await pollingConcept.close({ user: userAlice, poll: pollId }), {});

    // Verify poll is closed
    const getClosedPoll = await pollingConcept._getPoll({ poll: pollId });
    assertExists(getClosedPoll.poll);
    assertEquals(getClosedPoll.poll!.closed, true);

    // 6. Get the result
    const result = await pollingConcept.getResult({ poll: pollId });
    assertExists(result.option);
    assertEquals(result.option, optionA); // Pizza should be the winner with 2 votes
  });

  await t.step("Adding the same option twice (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Duplicate Option" });
    const pollId = (createResult as { poll: Poll }).poll;

    assertEquals(await pollingConcept.addOption({ poll: pollId, option: optionA }), {});
    const duplicateAddResult = await pollingConcept.addOption({ poll: pollId, option: optionA });
    assertNotEquals(duplicateAddResult, {}); // Should indicate an error
    assertExists((duplicateAddResult as { error: string }).error);
    assertEquals((duplicateAddResult as { error: string }).error, "Option already exists in this poll.");

    const pollState = await pollingConcept._getPoll({ poll: pollId });
    assertEquals(pollState.poll!.options.length, 1); // Only one optionA should be present
  });

  await t.step("Adding an option after the poll has been closed (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Closed Add Option" });
    const pollId = (createResult as { poll: Poll }).poll;

    assertEquals(await pollingConcept.close({ user: userAlice, poll: pollId }), {});
    const addOptionResult = await pollingConcept.addOption({ poll: pollId, option: optionA });
    assertNotEquals(addOptionResult, {});
    assertExists((addOptionResult as { error: string }).error);
    assertEquals((addOptionResult as { error: string }).error, "Cannot add option to a closed poll.");
  });

  await t.step("Removing an option after the poll has been closed (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Closed Remove Option" });
    const pollId = (createResult as { poll: Poll }).poll;
    await pollingConcept.addOption({ poll: pollId, option: optionA });

    assertEquals(await pollingConcept.close({ user: userAlice, poll: pollId }), {});
    const removeOptionResult = await pollingConcept.removeOption({ poll: pollId, option: optionA });
    assertNotEquals(removeOptionResult, {});
    assertExists((removeOptionResult as { error: string }).error);
    assertEquals((removeOptionResult as { error: string }).error, "Cannot remove option from a closed poll.");
  });

  await t.step("Removing an option with votes on it (should remove the votes)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Remove Option with Votes" });
    const pollId = (createResult as { poll: Poll }).poll;

    assertEquals(await pollingConcept.addOption({ poll: pollId, option: optionA }), {});
    assertEquals(await pollingConcept.addUser({ poll: pollId, user: userBob }), {});
    assertEquals(await pollingConcept.addVote({ user: userBob, option: optionA, poll: pollId }), {});

    const votesBeforeRemoval = await pollingConcept._getVotesForPoll({ poll: pollId });
    assertEquals(votesBeforeRemoval.votes.length, 1);

    assertEquals(await pollingConcept.removeOption({ poll: pollId, option: optionA }), {});

    const pollState = await pollingConcept._getPoll({ poll: pollId });
    assertEquals(pollState.poll!.options.length, 0);

    const votesAfterRemoval = await pollingConcept._getVotesForPoll({ poll: pollId });
    assertEquals(votesAfterRemoval.votes.length, 0); // Votes should be removed
  });

  await t.step("Adding a user who already exists (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Duplicate User" });
    const pollId = (createResult as { poll: Poll }).poll; // Alice is creator, so already a user

    const addExistingUserResult = await pollingConcept.addUser({ poll: pollId, user: userAlice });
    assertNotEquals(addExistingUserResult, {});
    assertExists((addExistingUserResult as { error: string }).error);
    assertEquals((addExistingUserResult as { error: string }).error, "User already participating in this poll.");

    const pollState = await pollingConcept._getPoll({ poll: pollId });
    assertEquals(pollState.poll!.users.length, 1); // Only one Alice
  });

  await t.step("Removing the poll creator (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Remove Creator" });
    const pollId = (createResult as { poll: Poll }).poll;

    const removeCreatorResult = await pollingConcept.removeUser({ poll: pollId, user: userAlice });
    assertNotEquals(removeCreatorResult, {});
    assertExists((removeCreatorResult as { error: string }).error);
    assertEquals((removeCreatorResult as { error: string }).error, "Cannot remove the poll creator.");
  });

  await t.step("User who is not in poll voting (should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Non-Participant Vote" });
    const pollId = (createResult as { poll: Poll }).poll;
    await pollingConcept.addOption({ poll: pollId, option: optionA });

    const voteResult = await pollingConcept.addVote({ user: userBob, option: optionA, poll: pollId }); // Bob is not added
    assertNotEquals(voteResult, {});
    assertExists((voteResult as { error: string }).error);
    assertEquals((voteResult as { error: string }).error, "User is not a participant in this poll.");

    const votes = await pollingConcept._getVotesForPoll({ poll: pollId });
    assertEquals(votes.votes.length, 0);
  });

  await t.step("Voting after the poll has been closed (addVote should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Closed Add Vote" });
    const pollId = (createResult as { poll: Poll }).poll;
    await pollingConcept.addOption({ poll: pollId, option: optionA });
    await pollingConcept.addUser({ poll: pollId, user: userBob });

    assertEquals(await pollingConcept.close({ user: userAlice, poll: pollId }), {});
    const addVoteResult = await pollingConcept.addVote({ user: userBob, option: optionA, poll: pollId });
    assertNotEquals(addVoteResult, {});
    assertExists((addVoteResult as { error: string }).error);
    assertEquals((addVoteResult as { error: string }).error, "Cannot vote on a closed poll.");
  });

  await t.step("Updating votes after the poll has been closed (updateVote should fail)", async () => {
    const createResult = await pollingConcept.create({ user: userAlice, name: "Test Poll Closed Update Vote" });
    const pollId = (createResult as { poll: Poll }).poll;
    await pollingConcept.addOption({ poll: pollId, option: optionA });
    await pollingConcept.addOption({ poll: pollId, option: optionB });
    await pollingConcept.addUser({ poll: pollId, user: userBob });
    await pollingConcept.addVote({ user: userBob, option: optionA, poll: pollId });

    assertEquals(await pollingConcept.close({ user: userAlice, poll: pollId }), {});
    const updateVoteResult = await pollingConcept.updateVote({ user: userBob, newOption: optionB, poll: pollId });
    assertNotEquals(updateVoteResult, {});
    assertExists((updateVoteResult as { error: string }).error);
    assertEquals((updateVoteResult as { error: string }).error, "Cannot update vote on a closed poll.");
  });

  // Clean up after all tests in this file
  await client.close();
});
```
