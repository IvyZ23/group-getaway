---
timestamp: 'Sun Oct 12 2025 15:22:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_152243.a3aac950.md]]'
content_id: b9cd9f310e8735031901ab115e1e64c1f18e9a2c7950a34d1718bf3454849697
---

# response:

```typescript
// file: src/TripPlanner/TripPlannerConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept TripPlanner
 * @purpose keep details about a trip all in one place
 */
export default class TripPlannerConcept {
  // Declare collection prefix, use concept name
  private static readonly PREFIX = "TripPlanner" + ".";

  // Generic types used by this concept
  type User = ID;
  type Trip = ID;

  /**
   * Represents a date range for a trip.
   */
  interface DateRange {
    start: Date;
    end: Date;
  }

  /**
   * Represents a participant in a trip.
   * A set of Participants with
   *   a user User
   *   a budget Number
   */
  interface Participant {
    user: User;
    budget: number;
  }

  /**
   * Represents a trip in the concept's state.
   * A set of Trips with
   *   a name String
   *   a finalized Flag
   *   an owner User
   *   a set of Participants
   *   a destination String
   *   a dateRange DateRange
   */
  interface TripState {
    _id: Trip;
    name: string;
    finalized: boolean;
    owner: User;
    participants: Participant[]; // Embedded participants
    destination: string;
    dateRange: DateRange;
  }

  private readonly trips: Collection<TripState>;

  constructor(private readonly db: Db) {
    this.trips = this.db.collection(TripPlannerConcept.PREFIX + "trips");
  }

  /**
   * @action create
   * @requires trip under user with same destination and date range not to already exist
   * @effects creates new trip
   */
  async create(
    { owner, destination, dateRange, name }: {
      owner: this['User'];
      destination: string;
      dateRange: this['DateRange'];
      name: string;
    },
  ): Promise<{ tripId: this['Trip'] } | { error: string }> {
    // Requires: trip under user with same destination and date range not to already exist
    const existingTrip = await this.trips.findOne({
      owner: owner,
      destination: destination,
      "dateRange.start": dateRange.start,
      "dateRange.end": dateRange.end,
    });

    if (existingTrip) {
      return {
        error:
          "A trip with the same destination and date range already exists for this user.",
      };
    }

    // Effects: creates new trip
    const newTripId = freshID();
    const newTrip: TripState = {
      _id: newTripId,
      name: name,
      finalized: false,
      owner: owner,
      participants: [], // Initialize with no participants
      destination: destination,
      dateRange: dateRange,
    };

    await this.trips.insertOne(newTrip);
    return { tripId: newTripId };
  }

  /**
   * @action update
   * @requires trip that belongs to user to exist
   * @effects updates trip info
   */
  async update(
    { owner, tripId, destination, dateRange, name }: {
      owner: this['User'];
      tripId: this['Trip'];
      destination: string;
      dateRange: this['DateRange'];
      name: string;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to user to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the user." };
    }

    // Effects: updates trip info
    await this.trips.updateOne(
      { _id: tripId },
      { $set: { name, destination, dateRange } },
    );
    return {};
  }

  /**
   * @action finalize
   * @requires trip that belongs to user to exist
   * @effects updates finalized flag of trip
   */
  async finalize(
    { owner, tripId, finalized }: {
      owner: this['User'];
      tripId: this['Trip'];
      finalized: boolean; // Renamed from Flag to a more descriptive boolean type
    },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to user to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the user." };
    }

    // Effects: updates finalized flag of trip
    await this.trips.updateOne({ _id: tripId }, { $set: { finalized } });
    return {};
  }

  /**
   * @action delete
   * @requires trip that belongs to user to exist
   * @effects deletes trip
   */
  async delete(
    { owner, tripId }: { owner: this['User']; tripId: this['Trip'] },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to user to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the user." };
    }

    // Effects: deletes trip
    await this.trips.deleteOne({ _id: tripId });
    return {};
  }

  /**
   * @action addParticipant
   * @requires trip that belongs to user to exist and user to not already exist in trip
   * @effects adds user to trip
   */
  async addParticipant(
    { owner, tripId, participantUser, budget }: {
      owner: this['User'];
      tripId: this['Trip'];
      participantUser: this['User'];
      budget: number;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to owner to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the owner." };
    }

    // Requires: participantUser to not already exist in trip
    if (trip.participants.some((p) => p.user === participantUser)) {
      return { error: "Participant already exists in this trip." };
    }

    // Effects: adds user to trip
    await this.trips.updateOne(
      { _id: tripId },
      { $push: { participants: { user: participantUser, budget: budget } } },
    );
    return {};
  }

  /**
   * @action updateParticipant
   * @requires trip that belongs to user to exist and user to exist as a participant of trip
   * @effects updates user info in trip
   */
  async updateParticipant(
    { owner, tripId, participantUser, budget }: {
      owner: this['User'];
      tripId: this['Trip'];
      participantUser: this['User'];
      budget: number;
    },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to owner to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the owner." };
    }

    // Requires: participantUser to exist as a participant of trip
    const participantIndex = trip.participants.findIndex((p) =>
      p.user === participantUser
    );
    if (participantIndex === -1) {
      return { error: "Participant not found in this trip." };
    }

    // Effects: updates user info in trip
    await this.trips.updateOne(
      { _id: tripId, "participants.user": participantUser },
      { $set: { "participants.$.budget": budget } },
    );
    return {};
  }

  /**
   * @action removeParticipant
   * @requires trip that belongs to user to exist and user to exist as a participant of trip
   * @effects removes user from trip
   */
  async removeParticipant(
    { owner, tripId, participantUser }: {
      owner: this['User'];
      tripId: this['Trip'];
      participantUser: this['User'];
    },
  ): Promise<Empty | { error: string }> {
    // Requires: trip that belongs to owner to exist
    const trip = await this.trips.findOne({ _id: tripId, owner: owner });
    if (!trip) {
      return { error: "Trip not found or does not belong to the owner." };
    }

    // Requires: participantUser to exist as a participant of trip
    if (!trip.participants.some((p) => p.user === participantUser)) {
      return { error: "Participant not found in this trip." };
    }

    // Effects: removes user from trip
    await this.trips.updateOne(
      { _id: tripId },
      { $pull: { participants: { user: participantUser } } },
    );
    return {};
  }

  // --- Queries ---

  /**
   * @query _getTripById
   * Returns a trip by its ID, optionally filtered by owner.
   */
  async _getTripById(
    { tripId, owner }: { tripId: this['Trip']; owner?: this['User'] },
  ): Promise<TripState | null> {
    const filter: { _id: this['Trip']; owner?: this['User'] } = { _id: tripId };
    if (owner) {
      filter.owner = owner;
    }
    return await this.trips.findOne(filter);
  }

  /**
   * @query _getTripsByUser
   * Returns all trips owned by a specific user.
   */
  async _getTripsByUser(
    { owner }: { owner: this['User'] },
  ): Promise<TripState[]> {
    return await this.trips.find({ owner: owner }).toArray();
  }

  /**
   * @query _getParticipantsInTrip
   * Returns the list of participants for a given trip.
   */
  async _getParticipantsInTrip(
    { tripId }: { tripId: this['Trip'] },
  ): Promise<this['Participant'][]> {
    const trip = await this.trips.findOne({ _id: tripId });
    return trip ? trip.participants : [];
  }
}
```
