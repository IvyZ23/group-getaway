import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";
// Import the runtime concept instances exposed by the engine. These provide
// instrumented action/query references that the sync engine expects.
import {
  CostSplitting,
  ItineraryPlanner as PlanItinerary,
  Polling,
  TripPlanning,
} from "@concepts";

/**
 * Syncs that wire concepts together:
 *  - when a Trip is created, create an Itinerary for it
 *  - when an Event is created for an Itinerary, create a Poll for that Event (creator = trip owner)
 *  - when an Event is approved, create a CostSplitting expense for that Event
 *
 * These syncs intentionally keep passthrough API shapes unchanged: the frontend may continue
 * to call the same concept actions (e.g. TripPlanning.create, PlanItinerary.addEvent, PlanItinerary.approveEvent)
 * and these synchronizations will run in the background to create the related artifacts.
 */

// We use the instrumented concept instances directly (they are exported from @concepts).

// 1) When a trip is created, create an itinerary for it.
export const CreateItineraryForTrip: Sync = (
  { owner, destination, dateRange, name, tripId },
) => {
  const tripCreated: ActionList = [
    TripPlanning.create as unknown as InstrumentedAction,
    { owner, destination, dateRange, name },
    { tripId },
  ];
  const createItinerary: ActionList = [
    PlanItinerary.create as unknown as InstrumentedAction,
    { trip: tripId },
  ];
  return {
    when: actions(tripCreated),
    then: actions(createItinerary),
  };
};

// 2) When an event is added to an itinerary, create a poll for that event.
export const CreatePollForEvent: Sync = (
  {
    name,
    cost,
    itinerary,
    event,
    eventDoc,
    itineraryDoc,
    tripId,
    tripDoc,
    poll,
    pollName,
    tripOwner,
  },
) => {
  const whenAddEvent: ActionList = [
    PlanItinerary.addEvent as unknown as InstrumentedAction,
    { name, cost, itinerary },
    { event },
  ];
  const thenCreatePoll: ActionList = [
    Polling.create as unknown as InstrumentedAction,
    { user: tripOwner, name: pollName },
    { poll },
  ];
  return {
    when: actions(whenAddEvent),
    where: async (frames) => {
      // Fetch the full event document and bind it to `eventDoc`
      frames = await frames.query(
        async (
          { event }: { event: ID },
        ) => [await PlanItinerary._getEventById({ event })],
        { event },
        { event: eventDoc },
      );

      // Extract itinerary id from the eventDoc and bind it to `itinerary` for the next query
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const ev = frame[eventDoc] as { itinerary?: unknown } | undefined;
        return { ...f, [itinerary]: ev?.itinerary } as Record<symbol, unknown>;
      });

      // Fetch the itinerary doc and bind to `itineraryDoc`
      frames = await frames.query(
        async (
          { itinerary }: { itinerary: ID },
        ) => [await PlanItinerary._getItineraryById({ itinerary })],
        { itinerary },
        { itinerary: itineraryDoc },
      );

      // Extract trip id from itineraryDoc and bind it to `tripId` for the next query
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const it = frame[itineraryDoc] as { trip?: unknown } | undefined;
        return { ...f, [tripId]: it?.trip } as Record<symbol, unknown>;
      });

      // Fetch the trip document and bind to `tripDoc`
      frames = await frames.query(
        async (
          { tripId }: { tripId: ID },
        ) => [await TripPlanning._getTripById({ tripId })],
        { tripId },
        { trip: tripDoc },
      );

      // Compute derived values: pollName and tripOwner
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const ev = frame[eventDoc] as { name?: string } | undefined;
        const td = frame[tripDoc] as { owner?: unknown } | undefined;
        return {
          ...f,
          [pollName]: ev ? `Poll: ${ev.name ?? ""}` : "Poll",
          [tripOwner]: td?.owner,
        } as Record<symbol, unknown>;
      });

      return frames;
    },
    then: actions(thenCreatePoll),
  };
};

// 3) When an event is approved, create a CostSplitting expense for that event (item = event id)
export const CreateCostSplittingForApprovedEvent: Sync = (
  { event, itinerary, eventDoc, cost, expenseId },
) => {
  const whenApprove: ActionList = [
    PlanItinerary.approveEvent as unknown as InstrumentedAction,
    { event, approved: true, itinerary },
    {},
  ];
  const thenCreateExpense: ActionList = [
    CostSplitting.create as unknown as InstrumentedAction,
    { item: event, cost },
    { expenseId },
  ];
  return {
    when: actions(whenApprove),
    where: async (frames) => {
      // Fetch the full event document and bind to eventDoc
      frames = await frames.query(
        async (
          { event }: { event: ID },
        ) => [await PlanItinerary._getEventById({ event })],
        { event },
        { event: eventDoc },
      );

      // Extract cost from eventDoc and bind it to `cost` symbol
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const ev = frame[eventDoc] as { cost?: number } | undefined;
        return { ...f, [cost]: ev?.cost } as Record<symbol, unknown>;
      });
      return frames;
    },
    then: actions(thenCreateExpense),
  };
};

export default [
  CreateItineraryForTrip,
  CreatePollForEvent,
  CreateCostSplittingForApprovedEvent,
];
