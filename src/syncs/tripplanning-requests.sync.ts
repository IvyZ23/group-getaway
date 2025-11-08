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
    { path: "/TripPlanning/_getTripById", tripId, user },
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
            tripId: tripId as ID,
          });
          const itResp = await PlanItinerary._getItineraryByTrip({
            trip: tripId as ID,
            user: user as unknown as ID | undefined,
          });
          const itRespRec = itResp as Record<string, unknown> | null;
          const itineraryDoc = itRespRec && "itinerary" in itRespRec
            ? (itRespRec["itinerary"] as Record<string, unknown>)
            : null;

          let events: unknown[] = [];
          if (itineraryDoc && typeof itineraryDoc["_id"] !== "undefined") {
            const evResp = await PlanItinerary._getAllEventsForItinerary({
              itinerary: itineraryDoc["_id"] as unknown as ID,
              user: user as unknown as ID | undefined,
            });
            const evRespRec = evResp as Record<string, unknown> | null;
            if (evRespRec && "events" in evRespRec) {
              events = (evRespRec["events"] as unknown[]) || [];
            }
          }

          const tripDocRec = tripDoc as unknown as
            | Record<string, unknown>
            | null;
          const enriched = {
            ...tripDoc,
            participants: participants ||
              (tripDocRec && (tripDocRec["participants"] as unknown[])) || [],
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
  where: (frames) =>
    frames.query(
      async ({ tripId }: { tripId: unknown }) => [{
        participants: await TripPlanning._getParticipantsInTrip({
          tripId: tripId as ID,
        }),
      }],
      { tripId },
      { participants },
    ),
  then: actions([Requesting.respond, { request, participants }]),
});

export default [GetTripById, GetParticipantsInTrip];
