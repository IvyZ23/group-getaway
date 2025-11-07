import { actions, Sync } from "@engine";
import {
  ItineraryPlanner as PlanItinerary,
  Requesting,
  TripPlanning,
} from "@concepts";
import type { ID } from "@utils/types.ts";

// Minimal TripPlanning request-syncs to handle trip fetching routes.
// This clean file is a temporary replacement while the original file is repaired.

export const GetTripById: Sync = ({ request, tripId, user, trip }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/_getTripById", tripId },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ tripId, user }: { tripId: unknown; user?: unknown }) => {
        try {
          const tripDoc = await TripPlanning._getTripById(
            { tripId: tripId as ID } as { tripId: ID },
          );
          if (!tripDoc) return [{ trip: null }];

          const participants = await TripPlanning._getParticipantsInTrip({
            tripId,
          });
          const itResp = await PlanItinerary._getItineraryByTrip({
            trip: tripId,
            user,
          });
          const itineraryDoc = (itResp && "itinerary" in itResp)
            ? (itResp as any).itinerary
            : null;

          let events: unknown[] = [];
          if (itineraryDoc && (itineraryDoc as any)._id) {
            const evResp = await PlanItinerary._getAllEventsForItinerary({
              itinerary: (itineraryDoc as any)._id as unknown as ID,
              user,
            });
            if (evResp && "events" in evResp) {
              events = (evResp as any).events || [];
            }
          }

          const enriched = {
            ...tripDoc,
            participants: participants || (tripDoc as any).participants || [],
            itinerary: itineraryDoc,
            events,
          };
          return [{ trip: enriched }];
        } catch (_err) {
          return [{ trip: null }];
        }
      },
      { tripId },
      { trip },
    );
  },
  then: actions([Requesting.respond, { request, trip }]),
});

export const GetParticipantsInTrip: Sync = (
  { request, tripId, participants },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/_getParticipantsInTrip", tripId },
    { request },
  ]),
  where: async (frames) =>
    frames.query(
      async (
        { tripId },
      ) => [{
        participants: await TripPlanning._getParticipantsInTrip({ tripId }),
      }],
      { tripId },
      { participants },
    ),
  then: actions([Requesting.respond, { request, participants }]),
});

export default [GetTripById, GetParticipantsInTrip];
import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning, ItineraryPlanner as PlanItinerary } from "@concepts";
import type { ID } from "@utils/types.ts";

// Focused TripPlanning Requesting syncs (create, getById, addParticipant,
// updateParticipant). Each path ensures Requesting.respond is called for
// success and error outcomes to avoid Requesting timeouts.

export const CreateTripRequest: Sync = ({ request, name, destination, dateRange, owner, user, tripId }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/create", name, destination, dateRange, owner, user },
    { request },
  ]),
  where: (frames) => frames.map((f) => {
    const frame = f as Record<symbol, unknown>;
    const resolvedOwner = frame[owner] ?? frame[user];
    return { ...f, [owner]: resolvedOwner } as Record<symbol, unknown>;
  }),
  then: actions([
    import { actions, Sync } from "@engine";
    import { Requesting, TripPlanning, ItineraryPlanner as PlanItinerary } from "@concepts";
    import type { ID } from "@utils/types.ts";

    // Minimal, clean TripPlanning Requesting syncs focused on trip fetches.
    // These implement `_getTripById` and `_getParticipantsInTrip` and always
    // call Requesting.respond for both success and error paths to avoid timeouts.

    export const GetTripById: Sync = ({ request, tripId, user, trip }) => ({
      when: actions([
        Requesting.request,
        { path: "/TripPlanning/_getTripById", tripId, user },
        { request },
      ]),
      where: async (frames) => {
        return await frames.query(async ({ tripId, user }) => {
          try {
            const tripDoc = await TripPlanning._getTripById({ tripId: tripId as ID } as { tripId: ID });
            if (!tripDoc) return [{ trip: null }];

            const participants = await TripPlanning._getParticipantsInTrip({ tripId });
            const itResp = await PlanItinerary._getItineraryByTrip({ trip: tripId, user });
            const itineraryDoc = (itResp && 'itinerary' in itResp) ? (itResp as any).itinerary : null;

            let events: unknown[] = [];
            if (itineraryDoc && (itineraryDoc as any)._id) {
              const evResp = await PlanItinerary._getAllEventsForItinerary({ itinerary: (itineraryDoc as any)._id as unknown as ID, user });
              if (evResp && 'events' in evResp) events = (evResp as any).events || [];
            }

            const enriched = { ...tripDoc, participants: participants || (tripDoc as any).participants || [], itinerary: itineraryDoc, events };
            return [{ trip: enriched }];
          } catch (_err) {
            return [{ trip: null }];
          }
        }, { tripId, user }, { trip });
      },
      then: actions([Requesting.respond, { request, trip }]),
    });

    export const GetParticipantsInTrip: Sync = ({ request, tripId, participants }) => ({
      when: actions([
        Requesting.request,
        { path: "/TripPlanning/_getParticipantsInTrip", tripId },
        { request },
      ]),
      where: async (frames) => frames.query(async ({ tripId }) => [{ participants: await TripPlanning._getParticipantsInTrip({ tripId }) }], { tripId }, { participants }),
      then: actions([Requesting.respond, { request, participants }]),
    });

    export default [GetTripById, GetParticipantsInTrip];
    { path: "/TripPlanning/removeParticipant", owner, tripId, participantUser, user },
    { request },
  ]),
  where: (frames) => {
    return frames.map((f) => {
      const frame = f as Record<symbol, unknown>;
      const resolvedOwner = frame[owner] ?? frame[user];
      return { ...f, [owner]: resolvedOwner } as Record<symbol, unknown>;
    });
  },
  then: actions([
    TripPlanning.removeParticipant as unknown as InstrumentedAction,
    { owner, tripId, participantUser },
    { error },
  ]),
});

export const RemoveParticipantResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeParticipant" }, { request }],
    [TripPlanning.removeParticipant, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveParticipantResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeParticipant" }, { request }],
    [TripPlanning.removeParticipant, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const RemoveSelfRequest: Sync = ({ request, user, tripId, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/removeSelf", user, tripId },
    { request },
  ]),
  then: actions([
    TripPlanning.removeSelf as unknown as InstrumentedAction,
    { user, tripId },
    { error },
  ]),
});

export const RemoveSelfResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeSelf" }, { request }],
    [TripPlanning.removeSelf, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveSelfResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeSelf" }, { request }],
    [TripPlanning.removeSelf, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [
  CreateTripRequest,
  CreateTripResponse,
  CreateTripResponseError,
  GetTripById,
  GetParticipantsInTrip,
  AddParticipantRequest,
  AddParticipantResponse,
  AddParticipantResponseSuccess,
  UpdateTripOwnerName,
  UpdateTripOwnerDestination,
  UpdateTripOwnerDateRange,
  UpdateTripUserName,
  UpdateTripUserDestination,
  UpdateTripUserDateRange,
  UpdateTripResponse,
  UpdateTripResponseError,
  FinalizeTripRequest,
  FinalizeTripResponse,
  FinalizeTripResponseError,
  DeleteTripRequest,
  DeleteTripResponse,
  DeleteTripResponseError,
  UpdateParticipantRequest,
  UpdateParticipantResponse,
  UpdateParticipantResponseError,
  RemoveParticipantRequest,
  RemoveParticipantResponse,
  RemoveParticipantResponseError,
  RemoveSelfRequest,
  RemoveSelfResponse,
  RemoveSelfResponseError,
];
