---
timestamp: 'Sun Oct 12 2025 19:38:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_193806.17f1f57f.md]]'
content_id: a63f70868bf981799edd60f8475c8fb66c0f51e04a08feb1f1ffc20782b17ff7
---

# response:

First, here's the updated `PlanItineraryConcept.ts` file which includes the `removeEvent` action and incorporates checks for finalization as discussed.

```typescript
// file: src/PlanItinerary/PlanItineraryConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides freshID() and getDb()

// Declare collection prefix, use concept name
const PREFIX = "PlanItinerary" + ".";

// Generic types of this concept
type Trip = ID; // External type parameter for the trip identifier
type Itinerary = ID; // The ID for an Itinerary document
type Event = ID; // The ID for an Event document

/**
 * @concept PlanItinerary [Trip]
 * @purpose allow for easier itinerary crafting between multiple people
 * @principle an itinerary is created for a trip. Users can add and remove events from
 * the intinerary. Added events await approval before being officially added. If it is not
 * approved, it will not be added to the itinerary.
 *
 * @state
 * a set of Itineraries with
 *   a trip Trip
 *   a set of Events (represented by an array of Event IDs)
 *   a finalized Flag
 */
interface ItineraryDoc {
  _id: Itinerary;
  trip: Trip;
  events: Event[]; // Array of approved Event IDs
  finalized: boolean;
}

/**
 * @state
 * a set of Events with
 *   a name String
 *   a cost Number
 *   a pending Flag
 *   an approved Flag
 *   an itineraryId (to link back to the parent Itinerary)
 */
interface EventDoc {
  _id: Event;
  itineraryId: Itinerary; // Foreign key linking to parent Itinerary
  name: string;
  cost: number;
  pending: boolean; // true if awaiting approval, false otherwise
  approved: boolean; // true if approved, false if rejected (only relevant if pending is false)
}

export default class PlanItineraryConcept {
  private itineraries: Collection<ItineraryDoc>;
  private events: Collection<EventDoc>;

  constructor(private readonly db: Db) {
    this.itineraries = this.db.collection(PREFIX + "itineraries");
    this.events = this.db.collection(PREFIX + "events");
  }

  // Helper to check if an itinerary is found and not finalized
  private async checkItineraryNotFinalized(itineraryId: Itinerary): Promise<{ itineraryDoc?: ItineraryDoc; error?: string }> {
    const itineraryDoc = await this.itineraries.findOne({ _id: itineraryId });
    if (!itineraryDoc) {
      return { error: `Itinerary ${itineraryId} not found.` };
    }
    if (itineraryDoc.finalized) {
      return { error: `Itinerary ${itineraryId} is finalized and cannot be modified.` };
    }
    return { itineraryDoc };
  }

  // --- Actions ---

  /**
   * @action create (trip:Trip): { itinerary: Itinerary }
   * @requires itinerary for trip to not already exist
   * @effects creates new itinerary for trip with an empty set of approved events and not finalized
   */
  async create({ trip }: { trip: Trip }): Promise<{ itinerary?: Itinerary; error?: string }> {
    // @requires Itinerary for trip must not already exist
    const existingItinerary = await this.itineraries.findOne({ trip });
    if (existingItinerary) {
      return { error: `An itinerary for trip ${trip} already exists.` };
    }

    const newItineraryId = freshID();
    const newItineraryDoc: ItineraryDoc = {
      _id: newItineraryId,
      trip: trip,
      events: [], // Initially no approved events
      finalized: false,
    };

    // @effects creates new itinerary for trip
    await this.itineraries.insertOne(newItineraryDoc);
    return { itinerary: newItineraryId };
  }

  /**
   * @action addEvent (name: String, cost: Number, itinerary: Itinerary): { event: Event }
   * @requires itinerary to exist and not be finalized
   * @effects adds a new pending event to the concept's state, associated with the itinerary.
   *          The event is initially marked as pending and not approved, and is not yet "officially added"
   *          to the itinerary's list of approved events.
   */
  async addEvent(
    { name, cost, itinerary: itineraryId }: { name: string; cost: number; itinerary: Itinerary },
  ): Promise<{ event?: Event; error?: string }> {
    // @requires itinerary to exist and not be finalized
    const checkResult = await this.checkItineraryNotFinalized(itineraryId);
    if (checkResult.error) {
      return { error: checkResult.error };
    }

    const newEventId = freshID();
    const newEventDoc: EventDoc = {
      _id: newEventId,
      itineraryId: itineraryId,
      name: name,
      cost: cost,
      pending: true,
      approved: false, // Initially not approved
    };

    // @effects adds new pending event
    await this.events.insertOne(newEventDoc);
    // As per the principle, it's not "officially added" to ItineraryDoc.events until approved.
    return { event: newEventId };
  }

  /**
   * @action updateEvent (event: Event, name: String, cost: Number, itinerary: Itinerary): Empty
   * @requires event to exist in itinerary and itinerary not to be finalized
   * @effects updates the event's name and cost. Does not change its approval status.
   */
  async updateEvent(
    { event: eventId, name, cost, itinerary: itineraryId }: { event: Event; name: string; cost: number; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
    // @requires itinerary not to be finalized
    const checkResult = await this.checkItineraryNotFinalized(itineraryId);
    if (checkResult.error) {
      return { error: checkResult.error };
    }

    // @requires event in itinerary to exist
    const result = await this.events.updateOne(
      { _id: eventId, itineraryId: itineraryId },
      { $set: { name: name, cost: cost } },
    );

    if (result.matchedCount === 0) {
      return { error: `Event ${eventId} not found in itinerary ${itineraryId}.` };
    }
    // @effects updates event's name and cost
    return {};
  }

  /**
   * @action approveEvent (event: Event, approved: Flag, itinerary: Itinerary): Empty
   * @requires event to exist in itinerary and itinerary not to be finalized
   * @effects sets the event's approval flag and updates its pending status to false.
   *          If approved, the event's ID is added to the itinerary's official list of events.
   *          If disapproved, the event's ID is removed from the itinerary's official list of events.
   */
  async approveEvent(
    { event: eventId, approved, itinerary: itineraryId }: { event: Event; approved: boolean; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
    // @requires itinerary not to be finalized
    const checkResult = await this.checkItineraryNotFinalized(itineraryId);
    if (checkResult.error) {
      return { error: checkResult.error };
    }

    // @requires event to exist in itinerary
    const eventDoc = await this.events.findOne({ _id: eventId, itineraryId: itineraryId });
    if (!eventDoc) {
      return { error: `Event ${eventId} not found in itinerary ${itineraryId}.` };
    }

    // @effects sets approval flag for event and update pending to false
    await this.events.updateOne(
      { _id: eventId },
      { $set: { pending: false, approved: approved } },
    );

    // Update the ItineraryDoc's 'events' array based on approval status ("officially added")
    if (approved) {
      // If approved, add to itinerary's 'events' array if not already there
      await this.itineraries.updateOne(
        { _id: itineraryId },
        { $addToSet: { events: eventId } }, // $addToSet ensures uniqueness
      );
    } else {
      // If disapproved, remove from itinerary's 'events' array
      await this.itineraries.updateOne(
        { _id: itineraryId },
        { $pull: { events: eventId } },
      );
    }

    return {};
  }

  /**
   * @action removeEvent (event: Event, itinerary: Itinerary): Empty
   * @requires event to exist in itinerary and itinerary not to be finalized
   * @effects removes the event record from the system and its ID from the itinerary's official list
   */
  async removeEvent(
    { event: eventId, itinerary: itineraryId }: { event: Event; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
    // @requires itinerary not to be finalized
    const checkResult = await this.checkItineraryNotFinalized(itineraryId);
    if (checkResult.error) {
      return { error: checkResult.error };
    }

    // @requires event to exist in itinerary
    const result = await this.events.deleteOne({ _id: eventId, itineraryId: itineraryId });

    if (result.deletedCount === 0) {
      return { error: `Event ${eventId} not found in itinerary ${itineraryId}.` };
    }

    // @effects removes event record from the system and its ID from the itinerary's official list
    await this.itineraries.updateOne(
      { _id: itineraryId },
      { $pull: { events: eventId } },
    );

    return {};
  }

  /**
   * @action finalizeItinerary (itinerary: Itinerary, finalized: Flag): Empty
   * @requires itinerary to exist
   * @effects sets itinerary's finalized flag to the given value
   */
  async finalizeItinerary(
    { itinerary: itineraryId, finalized }: { itinerary: Itinerary; finalized: boolean },
  ): Promise<Empty | { error: string }> {
    // @requires itinerary to exist
    const result = await this.itineraries.updateOne(
      { _id: itineraryId },
      { $set: { finalized: finalized } },
    );

    if (result.matchedCount === 0) {
      return { error: `Itinerary ${itineraryId} not found.` };
    }
    // @effects sets itinerary finalized to given flag
    return {};
  }

  // --- Queries ---

  /**
   * @query _getItineraryByTrip (trip: Trip): { itinerary: ItineraryDoc }
   * @effects returns the itinerary document for a given trip ID
   */
  async _getItineraryByTrip({ trip }: { trip: Trip }): Promise<{ itinerary?: ItineraryDoc; error?: string }> {
    const itinerary = await this.itineraries.findOne({ trip });
    if (!itinerary) {
      return { error: `No itinerary found for trip ${trip}.` };
    }
    return { itinerary };
  }

  /**
   * @query _getItineraryById (itinerary: Itinerary): { itinerary: ItineraryDoc }
   * @effects returns the itinerary document by its ID
   */
  async _getItineraryById({ itinerary: itineraryId }: { itinerary: Itinerary }): Promise<{ itinerary?: ItineraryDoc; error?: string }> {
    const itinerary = await this.itineraries.findOne({ _id: itineraryId });
    if (!itinerary) {
      return { error: `Itinerary ${itineraryId} not found.` };
    }
    return { itinerary };
  }

  /**
   * @query _getAllEventsForItinerary (itinerary: Itinerary): { events: EventDoc[] }
   * @effects returns all events (pending, approved, rejected) associated with a given itinerary
   */
  async _getAllEventsForItinerary({ itinerary: itineraryId }: { itinerary: Itinerary }): Promise<{ events: EventDoc[] }> {
    const events = await this.events.find({ itineraryId: itineraryId }).toArray();
    return { events };
  }

  /**
   * @query _getApprovedEventsForItinerary (itinerary: Itinerary): { events: EventDoc[] }
   * @effects returns only the officially approved events for a given itinerary by fetching their full documents
   */
  async _getApprovedEventsForItinerary({ itinerary: itineraryId }: { itinerary: Itinerary }): Promise<{ events?: EventDoc[]; error?: string }> {
    const itinerary = await this.itineraries.findOne({ _id: itineraryId });
    if (!itinerary) {
      return { error: `Itinerary ${itineraryId} not found.` };
    }
    if (itinerary.events.length === 0) {
        return { events: [] }; // No approved events referenced
    }
    // Fetch the full event documents for the approved event IDs
    const approvedEvents = await this.events.find({ _id: { $in: itinerary.events }, approved: true }).toArray();
    return { events: approvedEvents };
  }
}
```

Now, here are the tests for the `PlanItinerary` concept.

```typescript
// file: src/PlanItinerary/PlanItineraryConcept.test.ts

import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlanItineraryConcept from "./PlanItineraryConcept.ts";

Deno.test("PlanItinerary Concept Tests", async (test) => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  Deno.test.beforeAll(async () => {
    // Clean up collections before all tests in this file
    await db.collection("PlanItinerary.itineraries").deleteMany({});
    await db.collection("PlanItinerary.events").deleteMany({});
  });

  // trace: Operational Principle Test
  // an itinerary is created for a trip. Users can add and remove events from
  // the intinerary. Added events await approval before being officially added. If it is not
  // approved, it will not be added to the itinerary.
  test("should fulfill the operational principle of creating, adding, approving, disapproving, and removing events", async () => {
    const tripId = freshID();

    // 1. Create an itinerary for a trip.
    const createResult = await concept.create({ trip: tripId });
    assertExists(createResult.itinerary, "Itinerary should be created");
    const itineraryId = createResult.itinerary!;

    const getItineraryResult1 = await concept._getItineraryById({ itinerary: itineraryId });
    assertExists(getItineraryResult1.itinerary, "Itinerary should be retrievable");
    assertEquals(getItineraryResult1.itinerary!.trip, tripId, "Itinerary should be linked to the correct trip");
    assertEquals(getItineraryResult1.itinerary!.events.length, 0, "Initially no approved events");
    assertEquals(getItineraryResult1.itinerary!.finalized, false, "Itinerary should not be finalized");

    // 2. Add a pending event (Event A).
    const addEventAResult = await concept.addEvent({ name: "Dinner", cost: 50, itinerary: itineraryId });
    assertExists(addEventAResult.event, "Event A should be added");
    const eventAId = addEventAResult.event!;

    const allEvents1 = await concept._getAllEventsForItinerary({ itinerary: itineraryId });
    assertEquals(allEvents1.events.length, 1, "Should have 1 pending event");
    assertEquals(allEvents1.events[0].name, "Dinner", "Event A name should match");
    assertEquals(allEvents1.events[0].pending, true, "Event A should be pending");
    assertEquals(allEvents1.events[0].approved, false, "Event A should not be approved yet");

    // 3. Add another pending event (Event B).
    const addEventBResult = await concept.addEvent({ name: "Museum Visit", cost: 20, itinerary: itineraryId });
    assertExists(addEventBResult.event, "Event B should be added");
    const eventBId = addEventBResult.event!;

    const allEvents2 = await concept._getAllEventsForItinerary({ itinerary: itineraryId });
    assertEquals(allEvents2.events.length, 2, "Should have 2 pending events");

    // Query for approved events - none should be present yet
    const approvedEvents1 = await concept._getApprovedEventsForItinerary({ itinerary: itineraryId });
    assertEquals(approvedEvents1.events?.length, 0, "No events should be approved yet");

    // 4. Approve Event A.
    const approveEventAResult = await concept.approveEvent({ event: eventAId, approved: true, itinerary: itineraryId });
    assertEquals(approveEventAResult, {}, "Approving Event A should succeed");

    // Verify Event A status
    const eventADoc = (await concept.events.findOne({ _id: eventAId }))!;
    assertEquals(eventADoc.pending, false, "Event A should no longer be pending");
    assertEquals(eventADoc.approved, true, "Event A should be approved");

    // Verify itinerary's approved events list
    const approvedEvents2 = await concept._getApprovedEventsForItinerary({ itinerary: itineraryId });
    assertEquals(approvedEvents2.events?.length, 1, "Should have 1 approved event in itinerary");
    assertEquals(approvedEvents2.events![0]._id, eventAId, "Event A should be the approved event");

    // 5. Disapprove Event B.
    const disapproveEventBResult = await concept.approveEvent({ event: eventBId, approved: false, itinerary: itineraryId });
    assertEquals(disapproveEventBResult, {}, "Disapproving Event B should succeed");

    // Verify Event B status
    const eventBDoc = (await concept.events.findOne({ _id: eventBId }))!;
    assertEquals(eventBDoc.pending, false, "Event B should no longer be pending");
    assertEquals(eventBDoc.approved, false, "Event B should be disapproved");

    // Verify itinerary's approved events list - still only Event A
    const approvedEvents3 = await concept._getApprovedEventsForItinerary({ itinerary: itineraryId });
    assertEquals(approvedEvents3.events?.length, 1, "Should still have only 1 approved event (Event A)");
    assertEquals(approvedEvents3.events![0]._id, eventAId, "Event A should still be the only approved event");

    // 6. Remove Event B.
    const removeEventBResult = await concept.removeEvent({ event: eventBId, itinerary: itineraryId });
    assertEquals(removeEventBResult, {}, "Removing Event B should succeed");

    // Verify Event B is gone from the events collection
    const eventBCheck = await concept.events.findOne({ _id: eventBId });
    assertEquals(eventBCheck, null, "Event B should be completely removed");

    // Verify itinerary's approved events list - still only Event A, and B is definitely not there
    const approvedEvents4 = await concept._getApprovedEventsForItinerary({ itinerary: itineraryId });
    assertEquals(approvedEvents4.events?.length, 1, "Should still have only 1 approved event (Event A)");
    assertEquals(approvedEvents4.events![0]._id, eventAId, "Event A should still be the only approved event");
  });

  test("should prevent creating multiple itineraries for the same trip", async () => {
    const tripId = freshID();

    // First creation should succeed
    const createResult1 = await concept.create({ trip: tripId });
    assertExists(createResult1.itinerary, "First itinerary creation should succeed");

    // Second creation for the same trip should fail
    const createResult2 = await concept.create({ trip: tripId });
    assertExists(createResult2.error, "Second itinerary creation for the same trip should return an error");
    assertEquals(createResult2.error, `An itinerary for trip ${tripId} already exists.`, "Error message should indicate existing itinerary");

    const itinerariesCount = await concept.itineraries.countDocuments({ trip: tripId });
    assertEquals(itinerariesCount, 1, "Only one itinerary should exist for the trip");
  });

  test("should prevent adding an event to a non-existent itinerary", async () => {
    const nonExistentItineraryId = freshID() as ID;
    const addEventResult = await concept.addEvent({
      name: "Non-existent Party",
      cost: 100,
      itinerary: nonExistentItineraryId,
    });

    assertExists(addEventResult.error, "Adding event to non-existent itinerary should return an error");
    assertEquals(addEventResult.error, `Itinerary ${nonExistentItineraryId} not found.`, "Error message should indicate itinerary not found");

    const eventsCount = await concept.events.countDocuments({});
    assertEquals(eventsCount, 0, "No event should be added to the events collection");
  });

  test("should handle approving an already approved event idempotently", async () => {
    const tripId = freshID();
    const createResult = await concept.create({ trip: tripId });
    const itineraryId = createResult.itinerary!;

    const addEventResult = await concept.addEvent({ name: "Idempotent Event", cost: 30, itinerary: itineraryId });
    const eventId = addEventResult.event!;

    // First approval
    const approveResult1 = await concept.approveEvent({ event: eventId, approved: true, itinerary: itineraryId });
    assertEquals(approveResult1, {}, "First approval should succeed");

    const itineraryDoc1 = (await concept._getItineraryById({ itinerary: itineraryId })).itinerary!;
    assertArrayIncludes(itineraryDoc1.events, [eventId], "Itinerary should contain the event after first approval");
    assertEquals(itineraryDoc1.events.length, 1, "Itinerary should contain only one instance of the event after first approval");

    // Second approval (idempotent)
    const approveResult2 = await concept.approveEvent({ event: eventId, approved: true, itinerary: itineraryId });
    assertEquals(approveResult2, {}, "Second approval should succeed idempotently");

    const itineraryDoc2 = (await concept._getItineraryById({ itinerary: itineraryId })).itinerary!;
    assertArrayIncludes(itineraryDoc2.events, [eventId], "Itinerary should still contain the event after second approval");
    assertEquals(itineraryDoc2.events.length, 1, "Itinerary should still contain only one instance of the event after second approval");

    const eventDoc = (await concept.events.findOne({ _id: eventId }))!;
    assertEquals(eventDoc.approved, true, "Event itself should remain approved");
    assertEquals(eventDoc.pending, false, "Event itself should remain not pending");
  });

  test("should prevent modifications (add/update/approve/remove) after itinerary is finalized", async () => {
    const tripId = freshID();
    const createResult = await concept.create({ trip: tripId });
    const itineraryId = createResult.itinerary!;

    // Add and approve an event before finalization
    const addEventAResult = await concept.addEvent({ name: "Pre-Finalization Event", cost: 40, itinerary: itineraryId });
    const eventAId = addEventAResult.event!;
    await concept.approveEvent({ event: eventAId, approved: true, itinerary: itineraryId });

    // Finalize the itinerary
    const finalizeResult = await concept.finalizeItinerary({ itinerary: itineraryId, finalized: true });
    assertEquals(finalizeResult, {}, "Finalizing itinerary should succeed");

    const finalizedItineraryDoc = (await concept._getItineraryById({ itinerary: itineraryId })).itinerary!;
    assertEquals(finalizedItineraryDoc.finalized, true, "Itinerary should be marked as finalized");

    // Attempt to add new event after finalization
    const addEventAfterFinalizationResult = await concept.addEvent({ name: "Post-Finalization Event", cost: 60, itinerary: itineraryId });
    assertExists(addEventAfterFinalizationResult.error, "Adding event after finalization should fail");
    assertEquals(addEventAfterFinalizationResult.error, `Itinerary ${itineraryId} is finalized and cannot be modified.`);

    // Attempt to update existing event after finalization
    const updateEventAfterFinalizationResult = await concept.updateEvent({ event: eventAId, name: "Updated Pre-Finalization Event", cost: 45, itinerary: itineraryId });
    assertExists(updateEventAfterFinalizationResult.error, "Updating event after finalization should fail");
    assertEquals(updateEventAfterFinalizationResult.error, `Itinerary ${itineraryId} is finalized and cannot be modified.`);

    // Verify event A was not updated
    const eventADocAfterUpdateAttempt = (await concept.events.findOne({ _id: eventAId }))!;
    assertEquals(eventADocAfterUpdateAttempt.name, "Pre-Finalization Event", "Event A name should not have changed");
    assertEquals(eventADocAfterUpdateAttempt.cost, 40, "Event A cost should not have changed");


    // Add another event that is pending for testing approval
    const addEventBResult = await concept.addEvent({ name: "Another Pre-Finalization Event", cost: 25, itinerary: itineraryId });
    const eventBId = addEventBResult.event!;
    // Note: The above addEventBResult will actually fail because the itinerary is already finalized.
    // So, we need to create a scenario where event B was added *before* finalization, but *approved* after.
    // Let's re-run this test, but with `eventBId` added before finalization.

    // Reset database for this sub-scenario
    await db.collection("PlanItinerary.itineraries").deleteMany({});
    await db.collection("PlanItinerary.events").deleteMany({});
    const newTripId = freshID();
    const newCreateResult = await concept.create({ trip: newTripId });
    const newItineraryId = newCreateResult.itinerary!;
    const eventCResult = await concept.addEvent({ name: "Pending Event C", cost: 70, itinerary: newItineraryId });
    const eventCId = eventCResult.event!;
    await concept.finalizeItinerary({ itinerary: newItineraryId, finalized: true });
    
    // Attempt to approve event C after finalization
    const approveEventAfterFinalizationResult = await concept.approveEvent({ event: eventCId, approved: true, itinerary: newItineraryId });
    assertExists(approveEventAfterFinalizationResult.error, "Approving event after finalization should fail");
    assertEquals(approveEventAfterFinalizationResult.error, `Itinerary ${newItineraryId} is finalized and cannot be modified.`);

    // Verify event C was not approved
    const eventCDocAfterApprovalAttempt = (await concept.events.findOne({ _id: eventCId }))!;
    assertEquals(eventCDocAfterApprovalAttempt.approved, false, "Event C should still not be approved");

    // Attempt to remove event after finalization
    const removeEventAfterFinalizationResult = await concept.removeEvent({ event: eventCId, itinerary: newItineraryId });
    assertExists(removeEventAfterFinalizationResult.error, "Removing event after finalization should fail");
    assertEquals(removeEventAfterFinalizationResult.error, `Itinerary ${newItineraryId} is finalized and cannot be modified.`);

    // Verify event C was not removed
    const eventCDocAfterRemovalAttempt = await concept.events.findOne({ _id: eventCId });
    assertExists(eventCDocAfterRemovalAttempt, "Event C should still exist");
  });

  Deno.test.afterAll(async () => {
    await client.close();
  });
});
```
