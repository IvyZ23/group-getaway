import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PollingConcept from "./PollingConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCarol = "user:Carol" as ID;

const optionA = "option:Pizza" as ID;
const optionB = "option:Burgers" as ID;
const optionC = "option:Salad" as ID;

// ------------------------------------------------------------
// TEST 1 — Full operational principle
// ------------------------------------------------------------
Deno.test("PollingConcept: Operational Principle fulfillment", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  // 1. Alice creates a poll
  const createResult = await pollingConcept.create({
    user: userAlice,
    name: "Lunch Choices",
  });
  const pollId = (createResult as { poll: ID }).poll;
  assertExists(pollId);

  // Verify poll created
  const getPollBefore = await pollingConcept._getPoll({ poll: pollId });
  if ("poll" in getPollBefore) {
    assertExists(getPollBefore.poll);
    assertObjectMatch(getPollBefore.poll!, {
      name: "Lunch Choices",
      creator: userAlice,
      closed: false,
    });
  }

  // 2. Alice adds options
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    option: optionA,
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    option: optionB,
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    option: optionC,
  });

  // 3. Alice adds Bob and Carol
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll: pollId,
    userToAdd: userBob,
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll: pollId,
    userToAdd: userCarol,
  });

  // 4. Voting
  await pollingConcept.addVote({
    user: userAlice,
    option: optionA,
    poll: pollId,
  });
  await pollingConcept.addVote({
    user: userBob,
    option: optionA,
    poll: pollId,
  });
  await pollingConcept.addVote({
    user: userCarol,
    option: optionB,
    poll: pollId,
  });

  // 5. Close poll
  await pollingConcept.close({ actingUser: userAlice, poll: pollId });

  // 6. Get result (Pizza wins)
  const result = await pollingConcept.getResult({ poll: pollId });
  if ("option" in result) {
    assertEquals(result.option, optionA);
  }

  await client.close();
});

// ------------------------------------------------------------
// TEST 2 — Adding the same option twice should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Adding duplicate option fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Test Poll Duplicate Option",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  const dup = await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });

  assertExists((dup as { error: string }).error);
  assertEquals(
    (dup as { error: string }).error,
    "Option already exists in this poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 3 — Adding an option after the poll is closed should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Add option after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Closed Add Option",
  })) as { poll: ID };

  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  assertEquals(
    (res as { error: string }).error,
    "Cannot add option to a closed poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 4 — Removing option after closing poll should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Remove option after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Closed Remove Option",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.removeOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  assertEquals(
    (res as { error: string }).error,
    "Cannot remove option from a closed poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 5 — Removing an option with votes deletes those votes
// ------------------------------------------------------------
Deno.test("PollingConcept: Remove option also removes votes", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Remove Option with Votes",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });
  await pollingConcept.addVote({ user: userBob, option: optionA, poll });

  const before = await pollingConcept._getVotesForPoll({ poll });
  if ("votes" in before) {
    assertEquals(before.votes.length, 1);
  }

  await pollingConcept.removeOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });

  const after = await pollingConcept._getVotesForPoll({ poll });
  if ("votes" in after) {
    assertEquals(after.votes.length, 0);
  }

  await client.close();
});

// ------------------------------------------------------------
// TEST 6 — Adding existing user should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Add existing user fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Duplicate User Poll",
  })) as { poll: ID };

  const res = await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userAlice,
  });
  assertEquals(
    (res as { error: string }).error,
    "User already participating in this poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 7 — Removing poll creator should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Removing poll creator fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Remove Creator Poll",
  })) as { poll: ID };

  const res = await pollingConcept.removeUser({
    actingUser: userAlice,
    poll,
    userToRemove: userAlice,
  });
  assertEquals(
    (res as { error: string }).error,
    "Cannot remove the poll creator.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 8 — Non-participant trying to vote fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Non-participant vote fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Non-participant Vote",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });

  const res = await pollingConcept.addVote({
    user: userBob,
    option: optionA,
    poll,
  });
  assertEquals(
    (res as { error: string }).error,
    "User is not a participant in this poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 9 — Voting after poll closed fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Add vote after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Closed Add Vote Poll",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });
  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.addVote({
    user: userBob,
    option: optionA,
    poll,
  });
  assertEquals(
    (res as { error: string }).error,
    "Cannot vote on a closed poll.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 10 — Updating vote after poll closed fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Update vote after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = (await pollingConcept.create({
    user: userAlice,
    name: "Closed Update Vote Poll",
  })) as { poll: ID };

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionA,
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    option: optionB,
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });
  await pollingConcept.addVote({ user: userBob, option: optionA, poll });
  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.updateVote({
    user: userBob,
    newOption: optionB,
    poll,
  });
  assertEquals(
    (res as { error: string }).error,
    "Cannot update vote on a closed poll.",
  );

  await client.close();
});
