---
timestamp: 'Sun Oct 12 2025 19:37:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_193725.3dfe0b8d.md]]'
content_id: 460695df844a9b9f14f9a1dcd96df8fea6517dd6025de2ed91f0bcf14a825fff
---

# response:

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
   * @effects adds a new pending event to the concept's state, associated with the itinerary.
   *          The event is initially marked as pending and not approved, and is not yet "officially added"
   *          to the itinerary's list of approved events.
   */
  async addEvent(
    { name, cost, itinerary: itineraryId }: { name: string; cost: number; itinerary: Itinerary },
  ): Promise<{ event?: Event; error?: string }> {
    // Check if itinerary exists
    const itineraryExists = await this.itineraries.findOne({ _id: itineraryId });
    if (!itineraryExists) {
      return { error: `Itinerary ${itineraryId} not found.` };
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
   * @requires event in itinerary to exist
   * @effects updates the event's name and cost. Does not change its approval status.
   */
  async updateEvent(
    { event: eventId, name, cost, itinerary: itineraryId }: { event: Event; name: string; cost: number; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
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
   * @requires event to exist in itinerary
   * @effects sets the event's approval flag and updates its pending status to false.
   *          If approved, the event's ID is added to the itinerary's official list of events.
   *          If disapproved, the event's ID is removed from the itinerary's official list of events.
   */
  async approveEvent(
    { event: eventId, approved, itinerary: itineraryId }: { event: Event; approved: boolean; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
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
   * @requires event to exist in itinerary
   * @effects removes the event record from the system and its ID from the itinerary's official list
   */
  async removeEvent(
    { event: eventId, itinerary: itineraryId }: { event: Event; itinerary: Itinerary },
  ): Promise<Empty | { error: string }> {
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
