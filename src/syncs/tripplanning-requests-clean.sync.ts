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
