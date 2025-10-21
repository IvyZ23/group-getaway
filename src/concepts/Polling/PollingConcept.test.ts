import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PollingConcept from "./PollingConcept.ts";

// Reusable branded IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCarol = "user:Carol" as ID;

const optionA = "option:Pizza" as ID;
const optionB = "option:Burgers" as ID;
const optionC = "option:Salad" as ID;

// Helper to unwrap results and throw early if error
function unwrap<T extends Record<string, unknown>>(
  result: T | { error: string },
): T {
  if ("error" in result) throw new Error(result.error as string);
  return result;
}

// ------------------------------------------------------------
// TEST 1 — Full operational principle
// ------------------------------------------------------------
Deno.test("PollingConcept: Operational Principle fulfillment", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  // 1. Alice creates a poll
  const createResult = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Lunch Choices",
    }),
  );
  const pollId = createResult.poll;
  assertExists(pollId);

  // Verify poll created
  const getPollBefore = await pollingConcept._getPoll({ poll: pollId });
  if ("poll" in getPollBefore) {
    assertObjectMatch(getPollBefore.poll!, {
      name: "Lunch Choices",
      creator: userAlice,
      closed: false,
    });
  }

  // 2. Alice adds options (by label)
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    label: "Pizza",
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    label: "Burgers",
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll: pollId,
    label: "Salad",
  });

  // Get poll again to extract actual option IDs
  const pollAfterOptions = unwrap(
    await pollingConcept._getPoll({ poll: pollId }),
  );
  const options = pollAfterOptions.poll?.options ?? [];
  const pizzaId = options.find((o) => o.label === "Pizza")?._id as ID;
  const burgersId = options.find((o) => o.label === "Burgers")?._id as ID;

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
    optionId: pizzaId,
    poll: pollId,
  });
  await pollingConcept.addVote({
    user: userBob,
    optionId: pizzaId,
    poll: pollId,
  });
  await pollingConcept.addVote({
    user: userCarol,
    optionId: burgersId,
    poll: pollId,
  });

  // 5. Close poll
  await pollingConcept.close({ actingUser: userAlice, poll: pollId });

  // 6. Get result (Pizza wins)
  const result = unwrap(await pollingConcept.getResult({ poll: pollId }));
  assertEquals(result.option, pizzaId);

  await client.close();
});

// ------------------------------------------------------------
// TEST 2 — Adding the same label twice should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Adding duplicate label fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Test Poll Duplicate Option",
    }),
  );

  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });
  const dup = await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });

  assertEquals(
    (dup as { error: string }).error,
    "Option with this label already exists.",
  );

  await client.close();
});

// ------------------------------------------------------------
// TEST 3 — Adding an option after the poll is closed should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Add option after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({ user: userAlice, name: "Closed Add Option" }),
  );
  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
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

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Closed Remove Option",
    }),
  );
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });

  const pollDoc = unwrap(await pollingConcept._getPoll({ poll }));
  const optionId = pollDoc.poll?.options[0]._id as ID;

  await pollingConcept.close({ actingUser: userAlice, poll });
  const res = await pollingConcept.removeOption({
    actingUser: userAlice,
    poll,
    optionId,
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

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Remove Option with Votes",
    }),
  );
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });

  const pollDoc = unwrap(await pollingConcept._getPoll({ poll }));
  const pizzaId = pollDoc.poll?.options[0]._id as ID;

  await pollingConcept.addVote({ user: userBob, optionId: pizzaId, poll });

  const before = await pollingConcept._getVotesForPoll({ poll });
  assertEquals(before.votes.length, 1);

  await pollingConcept.removeOption({
    actingUser: userAlice,
    poll,
    optionId: pizzaId,
  });
  const after = await pollingConcept._getVotesForPoll({ poll });
  assertEquals(after.votes.length, 0);

  await client.close();
});

// ------------------------------------------------------------
// TEST 6 — Adding existing user should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Add existing user fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Duplicate User Poll",
    }),
  );
  const res = await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userAlice,
  });

  assertEquals((res as { error: string }).error, "User already in poll.");

  await client.close();
});

// ------------------------------------------------------------
// TEST 7 — Removing poll creator should fail
// ------------------------------------------------------------
Deno.test("PollingConcept: Removing poll creator fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Remove Creator Poll",
    }),
  );
  const res = await pollingConcept.removeUser?.({
    actingUser: userAlice,
    poll,
    userToRemove: userAlice,
  });

  if (res) {
    assertEquals(
      (res as { error: string }).error,
      "Cannot remove the poll creator.",
    );
  }

  await client.close();
});

// ------------------------------------------------------------
// TEST 8 — Non-participant trying to vote fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Non-participant vote fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Non-participant Vote",
    }),
  );
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });

  const pollDoc = unwrap(await pollingConcept._getPoll({ poll }));
  const pizzaId = pollDoc.poll?.options[0]._id as ID;

  const res = await pollingConcept.addVote({
    user: userBob,
    optionId: pizzaId,
    poll,
  });
  assertEquals((res as { error: string }).error, "User not part of this poll.");

  await client.close();
});

// ------------------------------------------------------------
// TEST 9 — Voting after poll closed fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Add vote after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Closed Add Vote Poll",
    }),
  );
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });

  const pollDoc = unwrap(await pollingConcept._getPoll({ poll }));
  const pizzaId = pollDoc.poll?.options[0]._id as ID;

  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.addVote({
    user: userBob,
    optionId: pizzaId,
    poll,
  });
  assertEquals((res as { error: string }).error, "Poll is closed.");

  await client.close();
});

// ------------------------------------------------------------
// TEST 10 — Updating vote after poll closed fails
// ------------------------------------------------------------
Deno.test("PollingConcept: Update vote after close fails", async () => {
  const [db, client] = await testDb();
  const pollingConcept = new PollingConcept(db);

  const { poll } = unwrap(
    await pollingConcept.create({
      user: userAlice,
      name: "Closed Update Vote Poll",
    }),
  );
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Pizza",
  });
  await pollingConcept.addOption({
    actingUser: userAlice,
    poll,
    label: "Burgers",
  });
  await pollingConcept.addUser({
    actingUser: userAlice,
    poll,
    userToAdd: userBob,
  });

  const pollDoc = unwrap(await pollingConcept._getPoll({ poll }));
  const pizzaId = pollDoc.poll?.options.find((o) => o.label === "Pizza")
    ?._id as ID;
  const burgersId = pollDoc.poll?.options.find((o) => o.label === "Burgers")
    ?._id as ID;

  await pollingConcept.addVote({ user: userBob, optionId: pizzaId, poll });
  await pollingConcept.close({ actingUser: userAlice, poll });

  const res = await pollingConcept.updateVote({
    user: userBob,
    newOption: burgersId,
    poll,
  });
  assertEquals((res as { error: string }).error, "Poll is closed.");

  await client.close();
});
