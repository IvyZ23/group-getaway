---
timestamp: 'Sun Oct 12 2025 15:34:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_153419.f80a0091.md]]'
content_id: 973204026daac00eb8445cb996236f1bd6173b3368454a4b2b1e471c0340b83b
---

# response:

```typescript
// file: src/TripPlanner/TripPlannerConcept.test.ts
import { Collection, Db } from "npm:mongodb";
import { assertEquals, assertExists, assertFalse, assertNotEquals, assertNull, assertTrue } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TripPlannerConcept, { DateRange, Participant, Trip, TripState, User } from "./TripPlannerConcept.ts"; // Assuming TripPlannerConcept.ts is in the same directory

Deno.test("TripPlannerConcept", async (t) => {
  const [db, client] = await testDb();
  const tripPlanner = new TripPlannerConcept(db);

  // Helper function to create a date range
  const createDateRange = (startOffsetDays: number, endOffsetDays: number): DateRange => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + startOffsetDays);
    const end = new Date(today);
    end.setDate(today.getDate() + endOffsetDays);
    return { start, end };
  };

  const owner1: User = freshID() as User;
  const owner2: User = freshID() as User;
  const participant1: User = freshID() as User;
  const participant2: User = freshID() as User;

  await t.step("should initialize correctly", async () => {
    assertExists(tripPlanner);
    const collectionNames = await db.listCollections().toArray();
    assertTrue(collectionNames.some((c) => c.name.includes("TripPlanner.trips")));
  });

  // trace: Principle fulfillment
  // A user creates a trip and keeps track of the destination and date the trip will take place.
  // They can add and remove participants to the trip and keep track of the budget for each participant.
  // The creator of the trip can finalize the trip once no more changes are needed or delete the trip if it is no longer happening.
  await t.step("operational principle: user creates, manages, and finalizes/deletes a trip", async () => {
    // 1. User creates a trip
    const dateRange1 = createDateRange(10, 20);
    const createResult = await tripPlanner.create({
      owner: owner1,
      destination: "Paris",
      dateRange: dateRange1,
      name: "Europe Adventure",
    });
    assertTrue("tripId" in createResult, `Expected success, got: ${JSON.stringify(createResult)}`);
    const tripId1: Trip = (createResult as { tripId: Trip }).tripId;

    let trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.name, "Europe Adventure");
    assertEquals(trip.destination, "Paris");
    assertEquals(trip.owner, owner1);
    assertFalse(trip.finalized);
    assertEquals(trip.participants.length, 0);

    // 2. User updates trip info
    const dateRange1_updated = createDateRange(15, 25);
    const updateResult = await tripPlanner.update({
      owner: owner1,
      tripId: tripId1,
      destination: "Rome",
      dateRange: dateRange1_updated,
      name: "Italian Getaway",
    });
    assertTrue("error" not in updateResult, `Expected success, got: ${JSON.stringify(updateResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.name, "Italian Getaway");
    assertEquals(trip.destination, "Rome");
    assertEquals(trip.dateRange.start.getTime(), dateRange1_updated.start.getTime());

    // 3. User adds participants with budget
    const addP1Result = await tripPlanner.addParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant1,
      budget: 1500,
    });
    assertTrue("error" not in addP1Result, `Expected success, got: ${JSON.stringify(addP1Result)}`);

    const addP2Result = await tripPlanner.addParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant2,
      budget: 2000,
    });
    assertTrue("error" not in addP2Result, `Expected success, got: ${JSON.stringify(addP2Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.participants.length, 2);
    assertTrue(trip.participants.some((p) => p.user === participant1 && p.budget === 1500));
    assertTrue(trip.participants.some((p) => p.user === participant2 && p.budget === 2000));

    // 4. User updates participant budget
    const updateP1Result = await tripPlanner.updateParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant1,
      budget: 1750,
    });
    assertTrue("error" not in updateP1Result, `Expected success, got: ${JSON.stringify(updateP1Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertTrue(trip.participants.some((p) => p.user === participant1 && p.budget === 1750));

    // 5. User removes a participant
    const removeP2Result = await tripPlanner.removeParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant2,
    });
    assertTrue("error" not in removeP2Result, `Expected success, got: ${JSON.stringify(removeP2Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.participants.length, 1);
    assertFalse(trip.participants.some((p) => p.user === participant2));

    // 6. Creator finalizes the trip
    const finalizeResult = await tripPlanner.finalize({ owner: owner1, tripId: tripId1, finalized: true });
    assertTrue("error" not in finalizeResult, `Expected success, got: ${JSON.stringify(finalizeResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertTrue(trip.finalized);

    // 7. Creator deletes the trip
    const deleteResult = await tripPlanner.delete({ owner: owner1, tripId: tripId1 });
    assertTrue("error" not in deleteResult, `Expected success, got: ${JSON.stringify(deleteResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertNull(trip, "Trip should be deleted");
  });

  await t.step("create: should prevent creating two trips for the same owner, destination, and date range", async () => {
    const dateRange = createDateRange(30, 40);
    const owner = freshID() as User;

    const createResult1 = await tripPlanner.create({
      owner,
      destination: "Tokyo",
      dateRange,
      name: "Japan Trip 1",
    });
    assertTrue("tripId" in createResult1, `Expected success, got: ${JSON.stringify(createResult1)}`);

    const createResult2 = await tripPlanner.create({
      owner,
      destination: "Tokyo",
      dateRange,
      name: "Japan Trip 2",
    });
    assertTrue("error" in createResult2, `Expected error, got: ${JSON.stringify(createResult2)}`);
    assertEquals(
      (createResult2 as { error: string }).error,
      "A trip with the same destination and date range already exists for this user.",
    );
  });

  await t.step("addParticipant: should prevent adding the same user twice to a trip", async () => {
    const dateRange = createDateRange(50, 60);
    const owner = freshID() as User;
    const participant = freshID() as User;

    const createResult = await tripPlanner.create({
      owner,
      destination: "Berlin",
      dateRange,
      name: "Germany Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    const addPResult1 = await tripPlanner.addParticipant({
      owner,
      tripId,
      participantUser: participant,
      budget: 1000,
    });
    assertTrue("error" not in addPResult1, `Expected success, got: ${JSON.stringify(addPResult1)}`);

    const addPResult2 = await tripPlanner.addParticipant({
      owner,
      tripId,
      participantUser: participant,
      budget: 1200, // Different budget should still be rejected if participant already exists
    });
    assertTrue("error" in addPResult2, `Expected error, got: ${JSON.stringify(addPResult2)}`);
    assertEquals((addPResult2 as { error: string }).error, "Participant already exists in this trip.");

    const trip = await tripPlanner._getTripById({ tripId, owner });
    assertExists(trip);
    assertEquals(trip.participants.length, 1, "Participant count should remain 1");
    assertEquals(trip.participants[0].budget, 1000, "Budget should be original, not updated by failed add");
  });

  await t.step("addParticipant: should return error if trip does not exist", async () => {
    const nonExistentTripId: Trip = freshID() as Trip;
    const owner = freshID() as User;
    const participant = freshID() as User;

    const addPResult = await tripPlanner.addParticipant({
      owner,
      tripId: nonExistentTripId,
      participantUser: participant,
      budget: 500,
    });
    assertTrue("error" in addPResult, `Expected error, got: ${JSON.stringify(addPResult)}`);
    assertEquals((addPResult as { error: string }).error, "Trip not found or not owned by owner.");
  });

  await t.step("finalize: non-owner trying to finalize a trip should result in an error", async () => {
    const dateRange = createDateRange(70, 80);
    const tripOwner = freshID() as User;
    const nonOwner = freshID() as User;

    const createResult = await tripPlanner.create({
      owner: tripOwner,
      destination: "Sydney",
      dateRange,
      name: "Australia Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    const finalizeResult = await tripPlanner.finalize({
      owner: nonOwner, // Attempt to finalize by non-owner
      tripId,
      finalized: true,
    });
    assertTrue("error" in finalizeResult, `Expected error, got: ${JSON.stringify(finalizeResult)}`);
    assertEquals((finalizeResult as { error: string }).error, "Trip not found or not owned by user.");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip);
    assertFalse(trip.finalized, "Trip should not be finalized by non-owner");
  });

  await t.step("updateParticipant: should return error if participant does not exist in trip", async () => {
    const dateRange = createDateRange(90, 100);
    const owner = freshID() as User;
    const participant = freshID() as User;
    const nonExistentParticipant = freshID() as User;

    const createResult = await tripPlanner.create({
      owner,
      destination: "London",
      dateRange,
      name: "UK Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    await tripPlanner.addParticipant({
      owner,
      tripId,
      participantUser: participant,
      budget: 1000,
    });

    const updateResult = await tripPlanner.updateParticipant({
      owner,
      tripId,
      participantUser: nonExistentParticipant,
      budget: 1500,
    });
    assertTrue("error" in updateResult, `Expected error, got: ${JSON.stringify(updateResult)}`);
    assertEquals((updateResult as { error: string }).error, "Participant not found in this trip.");
  });

  await t.step("removeParticipant: should return error if participant does not exist in trip", async () => {
    const dateRange = createDateRange(110, 120);
    const owner = freshID() as User;
    const participant = freshID() as User;
    const nonExistentParticipant = freshID() as User;

    const createResult = await tripPlanner.create({
      owner,
      destination: "Moscow",
      dateRange,
      name: "Russia Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    await tripPlanner.addParticipant({
      owner,
      tripId,
      participantUser: participant,
      budget: 1000,
    });

    const removeResult = await tripPlanner.removeParticipant({
      owner,
      tripId,
      participantUser: nonExistentParticipant,
    });
    assertTrue("error" in removeResult, `Expected error, got: ${JSON.stringify(removeResult)}`);
    assertEquals((removeResult as { error: string }).error, "Participant not found in this trip.");
  });

  await t.step("update: non-owner trying to update a trip should return an error", async () => {
    const dateRange = createDateRange(130, 140);
    const tripOwner = freshID() as User;
    const nonOwner = freshID() as User;

    const createResult = await tripPlanner.create({
      owner: tripOwner,
      destination: "Dubai",
      dateRange,
      name: "UAE Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    const updateResult = await tripPlanner.update({
      owner: nonOwner, // Attempt to update by non-owner
      tripId,
      destination: "Abu Dhabi",
      dateRange,
      name: "UAE Trip Updated",
    });
    assertTrue("error" in updateResult, `Expected error, got: ${JSON.stringify(updateResult)}`);
    assertEquals((updateResult as { error: string }).error, "Trip not found or not owned by user.");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip);
    assertEquals(trip.destination, "Dubai", "Destination should not be updated");
    assertEquals(trip.name, "UAE Trip", "Name should not be updated");
  });

  await t.step("delete: non-owner trying to delete a trip should return an error", async () => {
    const dateRange = createDateRange(150, 160);
    const tripOwner = freshID() as User;
    const nonOwner = freshID() as User;

    const createResult = await tripPlanner.create({
      owner: tripOwner,
      destination: "Cancun",
      dateRange,
      name: "Mexico Trip",
    });
    const tripId: Trip = (createResult as { tripId: Trip }).tripId;

    const deleteResult = await tripPlanner.delete({
      owner: nonOwner, // Attempt to delete by non-owner
      tripId,
    });
    assertTrue("error" in deleteResult, `Expected error, got: ${JSON.stringify(deleteResult)}`);
    assertEquals((deleteResult as { error: string }).error, "Trip not found or not owned by user.");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip, "Trip should not be deleted by non-owner");
  });

  await t.step("queries: _getTripsByUser should return all trips for an owner", async () => {
    const owner = freshID() as User;
    const dateRangeA = createDateRange(170, 180);
    const dateRangeB = createDateRange(190, 200);

    await tripPlanner.create({ owner, destination: "Hawaii", dateRange: dateRangeA, name: "Beach Trip" });
    await tripPlanner.create({ owner, destination: "Alaska", dateRange: dateRangeB, name: "Snow Trip" });

    const trips = await tripPlanner._getTripsByUser({ owner });
    assertEquals(trips.length, 2);
    assertTrue(trips.some((t) => t.name === "Beach Trip"));
    assertTrue(trips.some((t) => t.name === "Snow Trip"));

    const anotherOwner = freshID() as User;
    const noTrips = await tripPlanner._getTripsByUser({ owner: anotherOwner });
    assertEquals(noTrips.length, 0);
  });

  await t.step("queries: _getParticipantsInTrip should return all participants for a trip", async () => {
    const owner = freshID() as User;
    const tripId = (
      (await tripPlanner.create({
        owner,
        destination: "Mars",
        dateRange: createDateRange(210, 220),
        name: "Space Trip",
      })) as { tripId: Trip }
    ).tripId;

    await tripPlanner.addParticipant({ owner, tripId, participantUser: participant1, budget: 10000 });
    await tripPlanner.addParticipant({ owner, tripId, participantUser: participant2, budget: 20000 });

    const participants = await tripPlanner._getParticipantsInTrip({ tripId });
    assertEquals(participants.length, 2);
    assertTrue(participants.some((p) => p.user === participant1 && p.budget === 10000));
    assertTrue(participants.some((p) => p.user === participant2 && p.budget === 20000));

    const nonExistentTripParticipants = await tripPlanner._getParticipantsInTrip({ tripId: freshID() as Trip });
    assertEquals(nonExistentTripParticipants.length, 0);
  });

  await client.close();
});
```
