---
timestamp: 'Sun Oct 12 2025 15:33:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_153351.74cc15d1.md]]'
content_id: 71ffd9e158d751dde5f0e26d7b7d467ba042e5c6a7b32d8cc83d87ed3fa7fe6d
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/** Simple aliases for IDs */
export type User = ID;
export type Trip = ID;

/** Represents a date range for a trip */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Represents a participant in a trip */
export interface Participant {
  user: User;
  budget: number;
}

/** Represents a trip document in the database */
export interface TripState {
  _id: Trip;
  name: string;
  finalized: boolean;
  owner: User;
  participants: Participant[];
  destination: string;
  dateRange: DateRange;
}

export default class TripPlannerConcept {
  private static readonly PREFIX = "TripPlanner.";
  private readonly trips: Collection<TripState>;

  constructor(private readonly db: Db) {
    this.trips = this.db.collection<TripState>(
      TripPlannerConcept.PREFIX + "trips",
    );
  }

  async create({
    owner,
    destination,
    dateRange,
    name,
  }: {
    owner: User;
    destination: string;
    dateRange: DateRange;
    name: string;
  }): Promise<{ tripId: Trip } | { error: string }> {
    const existingTrip = await this.trips.findOne({
      owner,
      destination,
      "dateRange.start": dateRange.start,
      "dateRange.end": dateRange.end,
    });

    if (existingTrip) {
      return {
        error:
          "A trip with the same destination and date range already exists for this user.",
      };
    }

    const newTripId = freshID();
    const newTrip: TripState = {
      _id: newTripId,
      name,
      finalized: false,
      owner,
      participants: [],
      destination,
      dateRange,
    };

    await this.trips.insertOne(newTrip);
    return { tripId: newTripId };
  }

  async update({
    owner,
    tripId,
    destination,
    dateRange,
    name,
  }: {
    owner: User;
    tripId: Trip;
    destination: string;
    dateRange: DateRange;
    name: string;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by user." };

    await this.trips.updateOne(
      { _id: tripId },
      { $set: { name, destination, dateRange } },
    );
    return {};
  }

  async finalize({
    owner,
    tripId,
    finalized,
  }: {
    owner: User;
    tripId: Trip;
    finalized: boolean;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by user." };

    await this.trips.updateOne({ _id: tripId }, { $set: { finalized } });
    return {};
  }

  async delete({
    owner,
    tripId,
  }: {
    owner: User;
    tripId: Trip;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by user." };

    await this.trips.deleteOne({ _id: tripId });
    return {};
  }

  async addParticipant({
    owner,
    tripId,
    participantUser,
    budget,
  }: {
    owner: User;
    tripId: Trip;
    participantUser: User;
    budget: number;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by owner." };

    if (trip.participants.some((p) => p.user === participantUser)) {
      return { error: "Participant already exists in this trip." };
    }

    await this.trips.updateOne(
      { _id: tripId },
      { $push: { participants: { user: participantUser, budget } } },
    );
    return {};
  }

  async updateParticipant({
    owner,
    tripId,
    participantUser,
    budget,
  }: {
    owner: User;
    tripId: Trip;
    participantUser: User;
    budget: number;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by owner." };

    const exists = trip.participants.some((p) => p.user === participantUser);
    if (!exists) return { error: "Participant not found in this trip." };

    await this.trips.updateOne(
      { _id: tripId, "participants.user": participantUser },
      { $set: { "participants.$.budget": budget } },
    );
    return {};
  }

  async removeParticipant({
    owner,
    tripId,
    participantUser,
  }: {
    owner: User;
    tripId: Trip;
    participantUser: User;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId, owner });
    if (!trip) return { error: "Trip not found or not owned by owner." };

    const exists = trip.participants.some((p) => p.user === participantUser);
    if (!exists) return { error: "Participant not found in this trip." };

    await this.trips.updateOne(
      { _id: tripId },
      { $pull: { participants: { user: participantUser } } },
    );
    return {};
  }

  /** ===== Queries ===== */

  async _getTripById({
    tripId,
    owner,
  }: {
    tripId: Trip;
    owner?: User;
  }): Promise<TripState | null> {
    const filter: Record<string, unknown> = { _id: tripId };
    if (owner) filter.owner = owner;
    return await this.trips.findOne(filter);
  }

  async _getTripsByUser({ owner }: { owner: User }): Promise<TripState[]> {
    return await this.trips.find({ owner }).toArray();
  }

  async _getParticipantsInTrip({
    tripId,
  }: {
    tripId: Trip;
  }): Promise<Participant[]> {
    const trip = await this.trips.findOne({ _id: tripId });
    return trip ? trip.participants : [];
  }
}

```
