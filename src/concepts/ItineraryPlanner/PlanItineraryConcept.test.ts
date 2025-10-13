import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "jsr:@std/assert";
import { freshID, testDb } from "@utils/database.ts";
import PlanItineraryConcept from "./PlanItineraryConcept.ts";

let db: any;
let client: any;
let concept: PlanItineraryConcept;

Deno.test("Setup DB and concept", async () => {
  [db, client] = await testDb();
  concept = new PlanItineraryConcept(db);

  await db.collection("PlanItinerary.itineraries").deleteMany({});
  await db.collection("PlanItinerary.events").deleteMany({});
});

// --- Test: Create Itinerary ---
Deno.test("should create an itinerary", async () => {
  const tripId = freshID();
  const createResult = await concept.create({ trip: tripId });
  assertExists(createResult.itinerary);
  const itineraryId = createResult.itinerary!;

  const itineraryDoc =
    (await concept._getItineraryById({ itinerary: itineraryId })).itinerary!;
  assertEquals(itineraryDoc.trip, tripId);
  assertEquals(itineraryDoc.events.length, 0);
  assertEquals(itineraryDoc.finalized, false);
});

// --- Test: Prevent duplicate itineraries ---
Deno.test("should prevent creating multiple itineraries for the same trip", async () => {
  const tripId = freshID();
  await concept.create({ trip: tripId });

  const createResult2 = await concept.create({ trip: tripId });
  assertExists(createResult2.error);
  assertEquals(
    createResult2.error,
    `An itinerary for trip ${tripId} already exists.`,
  );
});

// --- Test: Add pending event ---
Deno.test("should add a pending event", async () => {
  const tripId = freshID();
  const { itinerary } = await concept.create({ trip: tripId });
  const itineraryId = itinerary!;

  const addEventResult = await concept.addEvent({
    name: "Dinner",
    cost: 50,
    itinerary: itineraryId,
  });
  assertExists(addEventResult.event);

  const eventDoc =
    (await concept._getEventById({ event: addEventResult.event! })).event!;
  assertEquals(eventDoc.name, "Dinner");
  assertEquals(eventDoc.pending, true);
  assertEquals(eventDoc.approved, false);
});

// --- Test: Approve and disapprove events ---
Deno.test("should approve and disapprove events correctly", async () => {
  const tripId = freshID();
  const { itinerary } = await concept.create({ trip: tripId });
  const itineraryId = itinerary!;

  const eventA =
    (await concept.addEvent({
      name: "Event A",
      cost: 10,
      itinerary: itineraryId,
    })).event!;
  const eventB =
    (await concept.addEvent({
      name: "Event B",
      cost: 20,
      itinerary: itineraryId,
    })).event!;

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
});

// --- Test: Remove event ---
Deno.test("should remove an event", async () => {
  const tripId = freshID();
  const { itinerary } = await concept.create({ trip: tripId });
  const itineraryId = itinerary!;

  const eventId =
    (await concept.addEvent({
      name: "Removable Event",
      cost: 30,
      itinerary: itineraryId,
    })).event!;
  await concept.removeEvent({ event: eventId, itinerary: itineraryId });

  const eventCheck = await concept._getEventById({ event: eventId });
  assertExists(eventCheck.error, "Event should be removed");
});

// --- Test: Prevent modifications after finalization ---
Deno.test("should prevent modifications after finalization", async () => {
  const tripId = freshID();
  const { itinerary } = await concept.create({ trip: tripId });
  const itineraryId = itinerary!;

  const eventId =
    (await concept.addEvent({
      name: "Event",
      cost: 40,
      itinerary: itineraryId,
    })).event!;
  await concept.finalizeItinerary({ itinerary: itineraryId, finalized: true });

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
});

// --- Cleanup ---
Deno.test("Close DB connection", async () => {
  await client.close();
});
