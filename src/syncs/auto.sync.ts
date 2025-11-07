import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import type { ID } from "../utils/types.ts";
// Import the runtime concept instances exposed by the engine. These provide
// instrumented action/query references that the sync engine expects.
import {
  CostSplitting,
  ItineraryPlanner as PlanItinerary,
  Polling,
  // SyncHelpers removed; use PlanItinerary.attachPollToEvent instead
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
  // Create the itinerary for the trip via a sync-driven instrumented action
  // (this keeps the logic as a synchronization rather than an action on the
  // TripPlanning concept). The PlanItinerary.create action is instrumented by
  // the engine and will create the itinerary record.
  const backgroundAction: ActionList = [
    PlanItinerary.create as unknown as InstrumentedAction,
    { trip: tripId },
    {},
  ];
  return {
    when: actions(tripCreated),
    then: actions(backgroundAction),
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

      // Extract itinerary id from the eventDoc (field is `itineraryId`) and bind it to `itinerary` for the next query
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const ev = frame[eventDoc] as { itineraryId?: unknown } | undefined;
        return { ...f, [itinerary]: ev?.itineraryId } as Record<
          symbol,
          unknown
        >;
      });

      // If no bound itinerary id exists on any frame, bail out early. This
      // prevents the following frames.query call from throwing a binding error
      // when `itinerary` is not present on the frame (some event docs may be
      // incomplete or the event may not be attached to an itinerary).
      const hasItinerary = frames.some((f) => {
        const fr = f as Record<symbol, unknown>;
        return typeof fr[itinerary] !== "undefined" && fr[itinerary] !== null;
      });
      if (!hasItinerary) {
        // Returning an empty Frames collection causes this sync's `then` to be
        // skipped for these frames (no poll will be created) and avoids the
        // binding error. Use frames.filter to return an empty Frames instance
        // with the correct API surface expected by the engine.
        return frames.filter(() => false);
      }

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

      // Fetch the trip document and bind to `tripDoc`.
      // TripPlanning._getTripById returns the trip document directly (not wrapped),
      // so return an object that binds to the `trip` output pattern.
      frames = await frames.query(
        async (
          { tripId }: { tripId: ID },
        ) => [{ trip: await TripPlanning._getTripById({ tripId }) }],
        { tripId },
        { trip: tripDoc },
      );

      // Compute derived values: pollName and tripOwner
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        const ev = frame[eventDoc] as { name?: string } | undefined;
        const td = frame[tripDoc] as { owner?: unknown } | undefined;
        // Use canonical poll naming for event polls so they can be looked up by
        // `event-<eventId>` and attached deterministically by the fallback
        // handler when Polling.create runs in a separate request.
        const eventId = frame[event] as string | undefined;
        return {
          ...f,
          [pollName]: eventId
            ? `event-${eventId}`
            : (ev ? `Poll: ${ev.name ?? ""}` : "Poll"),
          [tripOwner]: td?.owner,
        } as Record<symbol, unknown>;
      });

      // Debug: log derived values for visibility in server logs
      frames = frames.map((f) => {
        const frame = f as Record<symbol, unknown>;
        try {
          const nm = frame[pollName] as unknown as string | undefined;
          const owner = frame[tripOwner] as unknown as string | undefined;
          const ev = frame[event] as unknown as string | undefined;
          // eslint-disable-next-line no-console
          console.log("CreatePollForEvent - derived", {
            event: ev,
            pollName: nm,
            tripOwner: owner,
          });
        } catch (_e) {
          // ignore logging errors
        }
        return f;
      });

      return frames;
    },
    then: actions(thenCreatePoll),
  };
};

// When both an event is added and a poll is created in the same flow, attach
// the poll id to the event document so later fetches can return poll info.
export const AttachPollToEvent: Sync = ({ event, poll }) => {
  return {
    when: actions(
      [PlanItinerary.addEvent as unknown as InstrumentedAction, {}, { event }],
      [Polling.create as unknown as InstrumentedAction, {}, { poll }],
    ),
    then: actions([
      // Persist the poll id onto the event document via the PlanItinerary concept
      // so the DB update is performed by an instrumented action on the
      // ItineraryPlanner concept (keeps behavior in-domain and avoids
      // separate helper concepts that expose additional APIs).
      PlanItinerary.attachPollToEvent as unknown as InstrumentedAction,
      { event, poll },
      {},
    ]),
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
  AttachPollToEvent,
];
