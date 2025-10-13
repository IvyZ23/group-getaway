---
timestamp: 'Sun Oct 12 2025 15:37:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_153706.51ef4b97.md]]'
content_id: 52ce6d2e13f0c3a71f45604a49d7e0db95b941b1e83543311481d98ab9b4e2ff
---

# response:

```typescript
// file: src/TripPlanner/TripPlannerConcept.test.ts
import { Collection, Db } from "npm:mongodb";
import { assertEquals, assertExists, assertFalse, assertNotEquals, assertNull, assertTrue } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import TripPlannerConcept, { DateRange, Participant, Trip, TripState, User } from "./TripPlannerConcept.ts";

Deno.test("TripPlannerConcept", async (t) => {
  const [db, client] = await testDb();
  const tripPlanner = new TripPlannerConcept(db);

  // Helper function to create a date range relative to today
  const createDateRange = (startOffsetDays: number, endOffsetDays: number): DateRange => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + startOffsetDays);
    const end = new Date(today);
    end.setDate(today.getDate() + endOffsetDays);
    return { start, end };
  };

  // Define some generic users for testing
  const owner1: User = freshID() as User;
  const owner2: User = freshID() as User; // For non-owner tests
  const participant1: User = freshID() as User;
  const participant2: User = freshID() as User;

  await t.step("should initialize correctly", async () => {
    assertExists(tripPlanner);
    // Verify that the collection was created implicitly or exists
    const collectionNames = await db.listCollections().toArray();
    assertTrue(collectionNames.some((c) => c.name.includes("TripPlanner.trips")), "TripPlanner.trips collection should exist");
  });

  // trace: Principle fulfillment
  // A user creates a trip and keeps track of the destination and date the trip will take place.
  // They can add and remove participants to the trip and keep track of the budget for each participant.
  // The creator of the trip can finalize the trip once no more changes are needed or delete the trip if it is no longer happening.
  await t.step("operational principle: user creates, manages, and finalizes/deletes a trip", async () => {
    // 1. User creates a trip
    const dateRange1 = createDateRange(10, 20); // 10-20 days from now
    const createResult = await tripPlanner.create({
      owner: owner1,
      destination: "Paris",
      dateRange: dateRange1,
      name: "Europe Adventure",
    });
    assertTrue("tripId" in createResult, `Expected successful trip creation, got error: ${JSON.stringify(createResult)}`);
    const tripId1: Trip = (createResult as { tripId: Trip }).tripId;

    let trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip, "Trip should be found after creation");
    assertEquals(trip.name, "Europe Adventure");
    assertEquals(trip.destination, "Paris");
    assertEquals(trip.owner, owner1);
    assertFalse(trip.finalized, "Trip should not be finalized initially");
    assertEquals(trip.participants.length, 0, "Trip should have no participants initially");
    assertEquals(trip.dateRange.start.toISOString(), dateRange1.start.toISOString(), "Start date should match");
    assertEquals(trip.dateRange.end.toISOString(), dateRange1.end.toISOString(), "End date should match");


    // 2. User updates trip info
    const dateRange1_updated = createDateRange(15, 25); // Updated date range
    const updateResult = await tripPlanner.update({
      owner: owner1,
      tripId: tripId1,
      destination: "Rome",
      dateRange: dateRange1_updated,
      name: "Italian Getaway",
    });
    assertTrue("error" not in updateResult, `Expected successful trip update, got error: ${JSON.stringify(updateResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.name, "Italian Getaway", "Trip name should be updated");
    assertEquals(trip.destination, "Rome", "Trip destination should be updated");
    assertEquals(trip.dateRange.start.toISOString(), dateRange1_updated.start.toISOString(), "Updated start date should match");
    assertEquals(trip.dateRange.end.toISOString(), dateRange1_updated.end.toISOString(), "Updated end date should match");

    // 3. User adds participants with budget
    const addP1Result = await tripPlanner.addParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant1,
      budget: 1500,
    });
    assertTrue("error" not in addP1Result, `Expected successful participant add, got error: ${JSON.stringify(addP1Result)}`);

    const addP2Result = await tripPlanner.addParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant2,
      budget: 2000,
    });
    assertTrue("error" not in addP2Result, `Expected successful participant add, got error: ${JSON.stringify(addP2Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.participants.length, 2, "Trip should have 2 participants");
    assertTrue(trip.participants.some((p) => p.user === participant1 && p.budget === 1500), "Participant 1 should be added with correct budget");
    assertTrue(trip.participants.some((p) => p.user === participant2 && p.budget === 2000), "Participant 2 should be added with correct budget");

    // 4. User updates participant budget
    const updateP1Result = await tripPlanner.updateParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant1,
      budget: 1750,
    });
    assertTrue("error" not in updateP1Result, `Expected successful participant update, got error: ${JSON.stringify(updateP1Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertTrue(trip.participants.some((p) => p.user === participant1 && p.budget === 1750), "Participant 1 budget should be updated");
    assertFalse(trip.participants.some((p) => p.user === participant1 && p.budget === 1500), "Old budget for participant 1 should not exist");


    // 5. User removes a participant
    const removeP2Result = await tripPlanner.removeParticipant({
      owner: owner1,
      tripId: tripId1,
      participantUser: participant2,
    });
    assertTrue("error" not in removeP2Result, `Expected successful participant removal, got error: ${JSON.stringify(removeP2Result)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertEquals(trip.participants.length, 1, "Trip should have 1 participant after removal");
    assertFalse(trip.participants.some((p) => p.user === participant2), "Participant 2 should be removed");

    // 6. Creator finalizes the trip
    const finalizeResult = await tripPlanner.finalize({ owner: owner1, tripId: tripId1, finalized: true });
    assertTrue("error" not in finalizeResult, `Expected successful trip finalization, got error: ${JSON.stringify(finalizeResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertExists(trip);
    assertTrue(trip.finalized, "Trip should be finalized");

    // 7. Creator deletes the trip
    const deleteResult = await tripPlanner.delete({ owner: owner1, tripId: tripId1 });
    assertTrue("error" not in deleteResult, `Expected successful trip deletion, got error: ${JSON.stringify(deleteResult)}`);

    trip = await tripPlanner._getTripById({ tripId: tripId1, owner: owner1 });
    assertNull(trip, "Trip should be deleted and not found");
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
    assertTrue("tripId" in createResult1, `Expected first trip creation to succeed, got: ${JSON.stringify(createResult1)}`);

    const createResult2 = await tripPlanner.create({
      owner,
      destination: "Tokyo",
      dateRange,
      name: "Japan Trip 2", // Different name, but same owner, destination, dateRange
    });
    assertTrue("error" in createResult2, `Expected second trip creation to fail, got: ${JSON.stringify(createResult2)}`);
    assertEquals(
      (createResult2 as { error: string }).error,
      "A trip with the same destination and date range already exists for this user.",
      "Error message for duplicate trip should match",
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
    assertTrue("error" not in addPResult1, `Expected first add participant to succeed, got: ${JSON.stringify(addPResult1)}`);

    const addPResult2 = await tripPlanner.addParticipant({
      owner,
      tripId,
      participantUser: participant,
      budget: 1200, // Different budget should still be rejected if participant already exists
    });
    assertTrue("error" in addPResult2, `Expected second add participant to fail, got: ${JSON.stringify(addPResult2)}`);
    assertEquals((addPResult2 as { error: string }).error, "Participant already exists in this trip.", "Error message for duplicate participant should match");

    const trip = await tripPlanner._getTripById({ tripId, owner });
    assertExists(trip);
    assertEquals(trip.participants.length, 1, "Participant count should remain 1");
    assertEquals(trip.participants[0].budget, 1000, "Budget should be original, not updated by failed add attempt");
  });

  await t.step("addParticipant: should return error if trip does not exist or is not owned by the caller", async () => {
    const nonExistentTripId: Trip = freshID() as Trip;
    const owner = freshID() as User;
    const participant = freshID() as User;

    const addPResult = await tripPlanner.addParticipant({
      owner,
      tripId: nonExistentTripId,
      participantUser: participant,
      budget: 500,
    });
    assertTrue("error" in addPResult, `Expected add participant to non-existent trip to fail, got: ${JSON.stringify(addPResult)}`);
    assertEquals((addPResult as { error: string }).error, "Trip not found or not owned by owner.", "Error message for non-existent trip should match");
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
    assertTrue("error" in finalizeResult, `Expected non-owner finalize to fail, got: ${JSON.stringify(finalizeResult)}`);
    assertEquals((finalizeResult as { error: string }).error, "Trip not found or not owned by user.", "Error message for non-owner finalize should match");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip);
    assertFalse(trip.finalized, "Trip should not be finalized by non-owner");
  });

  await t.step("updateParticipant: should return error if participant does not exist in trip", async () => {
    const dateRange = createDateRange(90, 100);
    const owner = freshID() as User;
    const participant = freshID() as User; // This participant will be added
    const nonExistentParticipant = freshID() as User; // This participant will not be in the trip

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
      participantUser: nonExistentParticipant, // Try to update a participant not in the trip
      budget: 1500,
    });
    assertTrue("error" in updateResult, `Expected update non-existent participant to fail, got: ${JSON.stringify(updateResult)}`);
    assertEquals((updateResult as { error: string }).error, "Participant not found in this trip.", "Error message for non-existent participant update should match");

    // Verify the existing participant's budget was not affected
    const trip = await tripPlanner._getTripById({ tripId, owner });
    assertExists(trip);
    const existingP = trip.participants.find(p => p.user === participant);
    assertExists(existingP);
    assertEquals(existingP.budget, 1000, "Existing participant's budget should be unchanged");
  });

  await t.step("removeParticipant: should return error if participant does not exist in trip", async () => {
    const dateRange = createDateRange(110, 120);
    const owner = freshID() as User;
    const participant = freshID() as User; // This participant will be added
    const nonExistentParticipant = freshID() as User; // This participant will not be in the trip

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
      participantUser: nonExistentParticipant, // Try to remove a participant not in the trip
    });
    assertTrue("error" in removeResult, `Expected remove non-existent participant to fail, got: ${JSON.stringify(removeResult)}`);
    assertEquals((removeResult as { error: string }).error, "Participant not found in this trip.", "Error message for non-existent participant removal should match");

    // Verify the existing participant is still there
    const trip = await tripPlanner._getTripById({ tripId, owner });
    assertExists(trip);
    assertEquals(trip.participants.length, 1, "Existing participant should still be in the trip");
    assertTrue(trip.participants.some(p => p.user === participant), "Existing participant should still be found");
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
      dateRange: createDateRange(135, 145), // New date range
      name: "UAE Trip Updated",
    });
    assertTrue("error" in updateResult, `Expected non-owner update to fail, got: ${JSON.stringify(updateResult)}`);
    assertEquals((updateResult as { error: string }).error, "Trip not found or not owned by user.", "Error message for non-owner update should match");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip);
    assertEquals(trip.destination, "Dubai", "Destination should not be updated by non-owner");
    assertEquals(trip.name, "UAE Trip", "Name should not be updated by non-owner");
    assertEquals(trip.dateRange.start.toISOString(), dateRange.start.toISOString(), "Date range should not be updated by non-owner");
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
    assertTrue("error" in deleteResult, `Expected non-owner delete to fail, got: ${JSON.stringify(deleteResult)}`);
    assertEquals((deleteResult as { error: string }).error, "Trip not found or not owned by user.", "Error message for non-owner delete should match");

    const trip = await tripPlanner._getTripById({ tripId, owner: tripOwner });
    assertExists(trip, "Trip should not be deleted by non-owner");
  });

  // Additional tests for queries to ensure they work as expected
  await t.step("queries: _getTripsByUser should return all trips for an owner", async () => {
    const owner = freshID() as User;
    const dateRangeA = createDateRange(170, 180);
    const dateRangeB = createDateRange(190, 200);

    await tripPlanner.create({ owner, destination: "Hawaii", dateRange: dateRangeA, name: "Beach Trip" });
    await tripPlanner.create({ owner, destination: "Alaska", dateRange: dateRangeB, name: "Snow Trip" });

    const trips = await tripPlanner._getTripsByUser({ owner });
    assertEquals(trips.length, 2, "Should retrieve two trips for the owner");
    assertTrue(trips.some((t) => t.name === "Beach Trip"), "Should find Beach Trip");
    assertTrue(trips.some((t) => t.name === "Snow Trip"), "Should find Snow Trip");

    const anotherOwner = freshID() as User;
    const noTrips = await tripPlanner._getTripsByUser({ owner: anotherOwner });
    assertEquals(noTrips.length, 0, "Should retrieve no trips for an owner with no trips");
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
    assertEquals(participants.length, 2, "Should retrieve two participants for the trip");
    assertTrue(participants.some((p) => p.user === participant1 && p.budget === 10000), "Should find participant 1");
    assertTrue(participants.some((p) => p.user === participant2 && p.budget === 20000), "Should find participant 2");

    const nonExistentTripParticipants = await tripPlanner._getParticipantsInTrip({ tripId: freshID() as Trip });
    assertEquals(nonExistentTripParticipants.length, 0, "Should retrieve no participants for a non-existent trip");
  });

  await client.close();
});
```
