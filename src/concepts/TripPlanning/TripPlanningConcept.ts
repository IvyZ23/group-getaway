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

  /**
   * create(owner: User, destination: String, dateRange: DateRange, name: String): Trip
   *
   * @requires trip under owner with same destination and date range not to already exist
   * @effects creates new trip, adding the owner as the initial participant.
   */
  async create({
    dateRange,
    destination,
    name,
    owner,
  }: {
    owner: User;
    destination: string;
    dateRange: DateRange;
    name: string;
  }): Promise<{ tripId: Trip } | { error: string }> {
    // console.log(owner, destination, dateRange, name);
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
      // The owner is implicitly a participant, and we add them to the list here.
      // Default budget set to 0.
      participants: [{ user: owner, budget: 0 }],
      destination,
      dateRange,
    };

    await this.trips.insertOne(newTrip);
    return { tripId: newTripId };
  }

  /**
   * update(owner: User, tripId: Trip, destination: String, date: DateRange, name: String)
   *
   * @requires trip that belongs to owner to exist
   * @effects updates trip info
   */
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

  /**
   * finalize(owner: User, tripId: Trip, finalize: Flag)
   *
   * @requires trip that belongs to owner to exist
   * @effects updates finalized flag of trip
   */
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

  /**
   * delete(owner: User, tripId: Trip)
   *
   * @requires trip that belongs to owner to exist
   * @effects deletes trip
   */
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

  /**
   * addParticipant(owner: User, tripId: Trip, participantUser: User, budget: Number)
   *
   * @requires user to not already exist in trip (and caller to be owner)
   * @effects adds user to trip
   */
  async addParticipant({
    owner,
    tripId,
    participantUser,
    budget = 0, // Default budget if not provided
  }: {
    owner: User;
    tripId: Trip;
    participantUser: User;
    budget?: number;
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

  /**
   * updateParticipant(owner: User, budget: Number, tripId: Trip)
   *
   * @requires user to exist as a participant of trip (and caller to be owner or user themself)
   * @effects updates user info in trip
   */
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

  /**
   * removeParticipant(owner: User, tripId: Trip, participantUser: User)
   *
   * @requires user to exist as a participant of trip AND NOT be the owner (and caller to be owner)
   * @effects removes user from trip
   */
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

    // Owners cannot be removed as a participant via this action, they must delete the trip.
    if (trip.owner === participantUser) {
      return {
        error:
          "Owner cannot be removed as a participant via this action. Owners should delete the trip.",
      };
    }

    const exists = trip.participants.some((p) => p.user === participantUser);
    if (!exists) return { error: "Participant not found in this trip." };

    await this.trips.updateOne(
      { _id: tripId },
      { $pull: { participants: { user: participantUser } } },
    );
    return {};
  }

  /**
   * removeSelf (user: User, tripId: Trip)
   *
   * @requires user to exist as a participant of trip AND NOT be the owner of the trip
   * @effects removes user from trip's participants list
   */
  async removeSelf({
    user, // The user performing the action and being removed
    tripId,
  }: {
    user: User;
    tripId: Trip;
  }): Promise<Empty | { error: string }> {
    const trip = await this.trips.findOne({ _id: tripId });
    if (!trip) return { error: "Trip not found." };

    // An owner cannot remove themselves using this action; they must delete the trip.
    if (trip.owner === user) {
      return {
        error: "Owners cannot remove themselves; they must delete the trip.",
      };
    }

    const isParticipant = trip.participants.some((p) => p.user === user);
    if (!isParticipant) {
      return { error: "User is not a participant in this trip." };
    }

    await this.trips.updateOne(
      { _id: tripId },
      { $pull: { participants: { user: user } } },
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
    console.log(tripId, owner);
    const filter: Record<string, unknown> = { _id: tripId };
    if (owner) filter.owner = owner;
    // console.log(filter);
    console.log(await this.trips.findOne(filter));
    return await this.trips.findOne(filter);
  }

  async _getTripsByUser({ owner }: { owner: User }): Promise<TripState[]> {
    // console.log(owner);
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
