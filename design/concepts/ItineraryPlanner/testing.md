[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: PlanItinerary
Please include one test that is operational: A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example. Also include a test case for each of these scenarios:
- Attempt to create multiple itineraries for the same trip (should fail)
- Add an event to a non-existent itinerary (should fail)
- Approve an event that is already approved (should still work and idempotently not duplicate in ItineraryDoc.events)
- Attempt to add/update/approve/remove events after finalization (should not work)

Please split these into separate tests. Do not group them all together in one. 

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
import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "jsr:@std/assert";
import { freshID, testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlanItineraryConcept from "./PlanItineraryConcept.ts";

// --- Test: Create Itinerary ---
Deno.test("should create an itinerary", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    const createResult = await concept.create({ trip: tripId });
    assertExists(createResult.itinerary);
    const itineraryId = createResult.itinerary as ID;

    const itineraryDoc =
      (await concept._getItineraryById({ itinerary: itineraryId })).itinerary!;
    assertEquals(itineraryDoc.trip, tripId);
    assertEquals(itineraryDoc.events.length, 0);
    assertEquals(itineraryDoc.finalized, false);
  } finally {
    await client.close();
  }
});

// --- Test: Prevent duplicate itineraries ---
Deno.test("should prevent creating multiple itineraries for the same trip", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    await concept.create({ trip: tripId });

    const createResult2 = await concept.create({ trip: tripId });
    assertExists(createResult2.error);
    assertEquals(
      createResult2.error,
      `An itinerary for trip ${tripId} already exists.`,
    );
  } finally {
    await client.close();
  }
});

// --- Test: Add pending event ---
Deno.test("should add a pending event", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    const { itinerary } = (await concept.create({ trip: tripId })) as {
      itinerary: ID;
    };
    const itineraryId = itinerary as ID;

    const addEventResult = await concept.addEvent({
      name: "Dinner",
      cost: 50,
      itinerary: itineraryId,
    });
    assertExists(addEventResult.event);
    const eventId = addEventResult.event as ID;

    const eventDoc = (await concept._getEventById({ event: eventId })).event!;
    assertEquals(eventDoc.name, "Dinner");
    assertEquals(eventDoc.pending, true);
    assertEquals(eventDoc.approved, false);
  } finally {
    await client.close();
  }
});

// --- Test: Approve and disapprove events ---
Deno.test("should approve and disapprove events correctly", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    const { itinerary } = (await concept.create({ trip: tripId })) as {
      itinerary: ID;
    };
    const itineraryId = itinerary as ID;

    const eventA = (await concept.addEvent({
      name: "Event A",
      cost: 10,
      itinerary: itineraryId,
    })).event as ID;

    const eventB = (await concept.addEvent({
      name: "Event B",
      cost: 20,
      itinerary: itineraryId,
    })).event as ID;

    await concept.approveEvent({
      event: eventA,
      approved: true,
      itinerary: itineraryId,
    });
    await concept.approveEvent({
      event: eventB,
      approved: false,
      itinerary: itineraryId,
    });

    const approvedEvents =
      (await concept._getApprovedEventsForItinerary({ itinerary: itineraryId }))
        .events!;
    assertEquals(approvedEvents.length, 1);
    assertEquals(approvedEvents[0]._id, eventA);
  } finally {
    await client.close();
  }
});

// --- Test: Remove event ---
Deno.test("should remove an event", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    const { itinerary } = (await concept.create({ trip: tripId })) as {
      itinerary: ID;
    };
    const itineraryId = itinerary as ID;

    const eventId = (await concept.addEvent({
      name: "Removable Event",
      cost: 30,
      itinerary: itineraryId,
    })).event as ID;

    await concept.removeEvent({ event: eventId, itinerary: itineraryId });

    const eventCheck = await concept._getEventById({ event: eventId });
    assertExists(eventCheck.error, "Event should be removed");
  } finally {
    await client.close();
  }
});

// --- Test: Prevent modifications after finalization ---
Deno.test("should prevent modifications after finalization", async () => {
  const [db, client] = await testDb();
  const concept = new PlanItineraryConcept(db);

  try {
    const tripId = freshID() as ID;
    const { itinerary } = (await concept.create({ trip: tripId })) as {
      itinerary: ID;
    };
    const itineraryId = itinerary as ID;

    const eventId = (await concept.addEvent({
      name: "Event",
      cost: 40,
      itinerary: itineraryId,
    })).event as ID;

    await concept.finalizeItinerary({
      itinerary: itineraryId,
      finalized: true,
    });

    const addResult = await concept.addEvent({
      name: "New Event",
      cost: 50,
      itinerary: itineraryId,
    });
    assertExists(addResult.error);

    const approveResult = await concept.approveEvent({
      event: eventId,
      approved: true,
      itinerary: itineraryId,
    });
    assertExists(approveResult.error);

    const removeResult = await concept.removeEvent({
      event: eventId,
      itinerary: itineraryId,
    });
    assertExists(removeResult.error);

    const updateResult = await concept.updateEvent({
      event: eventId,
      name: "Updated",
      cost: 45,
      itinerary: itineraryId,
    });
    assertExists(updateResult.error);
  } finally {
    await client.close();
  }
});

```
