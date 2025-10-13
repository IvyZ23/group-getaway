import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TripPlanningConcept, {
  DateRange,
  Trip,
  User,
} from "./TripPlanningConcept.ts";
import { freshID } from "@utils/database.ts";

function makeRange(startOffset: number, endOffset: number): DateRange {
  const start = new Date(Date.now() + startOffset * 86400000);
  const end = new Date(Date.now() + endOffset * 86400000);
  return { start, end };
}

Deno.test("TripPlanningConcept: create trip", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;

  const res = await planner.create({
    owner,
    destination: "Seoul",
    dateRange: makeRange(1, 5),
    name: "Korea Trip",
  });

  assertExists(res);
  if ("tripId" in res) {
    const trip = await planner._getTripById({ tripId: res.tripId, owner });
    assertEquals(trip?.destination, "Seoul");
  } else {
    throw new Error("Trip creation failed: " + res.error);
  }

  await client.close();
});

Deno.test("TripPlanningConcept: prevent duplicate trip creation", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;
  const range = makeRange(1, 5);

  await planner.create({
    owner,
    destination: "Seoul",
    dateRange: range,
    name: "Original Trip",
  });

  const dup = await planner.create({
    owner,
    destination: "Seoul",
    dateRange: range,
    name: "Duplicate Trip",
  });

  if ("error" in dup) {
    assertExists(dup.error);
  } else {
    throw new Error(
      "Expected duplicate to fail, but it succeeded with tripId: " + dup.tripId,
    );
  }

  await client.close();
});

Deno.test("TripPlanningConcept: update trip details", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;

  const createRes = await planner.create({
    owner,
    destination: "Tokyo",
    dateRange: makeRange(2, 4),
    name: "Japan Trip",
  });

  if (!("tripId" in createRes)) throw new Error("Create failed");

  await planner.update({
    owner,
    tripId: createRes.tripId,
    destination: "Osaka",
    dateRange: makeRange(3, 6),
    name: "Updated Japan Trip",
  });

  const updated = await planner._getTripById({
    tripId: createRes.tripId,
    owner,
  });
  assertEquals(updated?.destination, "Osaka");

  await client.close();
});

Deno.test("TripPlanningConcept: finalize trip", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;

  const res = await planner.create({
    owner,
    destination: "Paris",
    dateRange: makeRange(1, 3),
    name: "France Trip",
  });

  if (!("tripId" in res)) throw new Error("Create failed");

  await planner.finalize({ owner, tripId: res.tripId, finalized: true });

  const trip = await planner._getTripById({ tripId: res.tripId, owner });
  assertEquals(trip?.finalized, true);

  await client.close();
});

Deno.test("TripPlanningConcept: delete trip", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;

  const res = await planner.create({
    owner,
    destination: "Sydney",
    dateRange: makeRange(1, 5),
    name: "Australia Trip",
  });

  if (!("tripId" in res)) throw new Error("Create failed");
  const tripId = res.tripId;

  await planner.delete({ owner, tripId });

  const deleted = await planner._getTripById({ tripId, owner });
  assertEquals(deleted, null);

  await client.close();
});

Deno.test("TripPlanningConcept: add, update, remove participant, including self removal", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;
  const participant: User = freshID() as User;

  const res = await planner.create({
    owner,
    destination: "New York",
    dateRange: makeRange(1, 5),
    name: "NY Trip",
  });

  if (!("tripId" in res)) throw new Error("Trip creation failed");
  const tripId = res.tripId;

  // Add participant by owner
  await planner.addParticipant({
    owner,
    tripId,
    participantUser: participant,
    budget: 500,
  });

  let trip = await planner._getTripById({ tripId, owner });
  assertEquals(trip?.participants.length, 2, "Should have owner + participant");

  // Update participant budget by owner
  await planner.updateParticipant({
    owner,
    tripId,
    participantUser: participant,
    budget: 1000,
  });

  trip = await planner._getTripById({ tripId, owner });
  assertEquals(
    trip?.participants.find((p) => p.user === participant)?.budget,
    1000,
  );

  // Participant removes self
  await planner.removeSelf({ user: participant, tripId });
  trip = await planner._getTripById({ tripId, owner });
  assertEquals(
    trip?.participants.length,
    1,
    "Only owner should remain after self removal",
  );

  // Owner removes participant (re-add first)
  await planner.addParticipant({
    owner,
    tripId,
    participantUser: participant,
    budget: 500,
  });

  await planner.removeParticipant({
    owner,
    tripId,
    participantUser: participant,
  });
  trip = await planner._getTripById({ tripId, owner });
  assertEquals(
    trip?.participants.length,
    1,
    "Only owner should remain after owner removal",
  );

  await client.close();
});

Deno.test("TripPlanningConcept: reject non-owner modifications except self removal", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;
  const stranger: User = freshID() as User;

  const res = await planner.create({
    owner,
    destination: "Rome",
    dateRange: makeRange(1, 3),
    name: "Italy Trip",
  });

  if (!("tripId" in res)) throw new Error("Trip creation failed");
  const tripId = res.tripId;

  // Stranger tries to update, finalize, delete
  const badUpdate = await planner.update({
    owner: stranger,
    tripId,
    destination: "Florence",
    dateRange: makeRange(2, 4),
    name: "Fake Update",
  });
  assertExists(badUpdate.error);

  const badFinalize = await planner.finalize({
    owner: stranger,
    tripId,
    finalized: false,
  });
  assertExists(badFinalize.error);

  const badDelete = await planner.delete({
    owner: stranger,
    tripId,
  });
  assertExists(badDelete.error);

  // Stranger cannot remove another participant
  const participant: User = freshID() as User;
  await planner.addParticipant({ owner, tripId, participantUser: participant });
  const badRemove = await planner.removeParticipant({
    owner: stranger,
    tripId,
    participantUser: participant,
  });
  assertExists(badRemove.error);

  // Stranger can remove themselves if they are a participant
  await planner.addParticipant({ owner, tripId, participantUser: stranger });
  const selfRemove = await planner.removeSelf({ user: stranger, tripId });
  assertEquals("error" in selfRemove, false);

  await client.close();
});

Deno.test("TripPlanningConcept: queries return correct data including participants", async () => {
  const [db, client] = await testDb();
  const planner = new TripPlanningConcept(db);
  const owner: User = freshID() as User;

  const t1 = await planner.create({
    owner,
    destination: "Berlin",
    dateRange: makeRange(1, 2),
    name: "Trip A",
  });
  const t2 = await planner.create({
    owner,
    destination: "Munich",
    dateRange: makeRange(3, 4),
    name: "Trip B",
  });

  if (!("tripId" in t1) || !("tripId" in t2)) throw new Error("Create failed");

  const allTrips = await planner._getTripsByUser({ owner });
  assertEquals(allTrips.length, 2);

  const participant: User = freshID() as User;
  await planner.addParticipant({
    owner,
    tripId: t1.tripId,
    participantUser: participant,
    budget: 800,
  });

  const participants = await planner._getParticipantsInTrip({
    tripId: t1.tripId,
  });
  assertEquals(participants.length, 2, "Should include owner + participant");

  await client.close();
});
