import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import {
  ItineraryPlanner as PlanItinerary,
  Polling,
  Requesting,
} from "@concepts";
import type { ID } from "../utils/types.ts";

// Handle direct API requests to create an itinerary (frontend calls
// POST /ItineraryPlanner/create). This maps the Requesting.request into the
// instrumented PlanItinerary.create action and responds with the created id.
export const CreateItineraryRequest: Sync = (
  { request, trip, user, itinerary },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/create", trip, user },
    { request },
  ]),
  then: (() => {
    const createItinerary: ActionList = [
      PlanItinerary.create as unknown as InstrumentedAction,
      { trip },
      { itinerary },
    ];
    return actions(createItinerary);
  })(),
});

export const CreateItineraryResponse: Sync = ({ request, itinerary }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/create" }, { request }],
    [PlanItinerary.create, {}, { itinerary }],
  ),
  then: actions([Requesting.respond, { request, itinerary }]),
});

// Also handle the error case: if PlanItinerary.create returns an `error` key
// (e.g. when an itinerary already exists), respond with the error so the
// pending Requesting request is resolved instead of timing out.
export const CreateItineraryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/create" }, { request }],
    [PlanItinerary.create, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Query: get itinerary by trip
export const GetItineraryByTrip: Sync = ({ request, trip, itinerary }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getItineraryByTrip", trip },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ trip }) => [
        { itinerary: await PlanItinerary._getItineraryByTrip({ trip }) },
      ],
      { trip },
      { itinerary },
    );
  },
  then: actions([Requesting.respond, { request, itinerary }]),
});

// Query: get itinerary by id
export const GetItineraryById: Sync = (
  { request, itinerary, itineraryDoc },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getItineraryById", itinerary },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ itinerary }) => [
        { itinerary: await PlanItinerary._getItineraryById({ itinerary }) },
      ],
      { itinerary },
      { itinerary: itineraryDoc },
    );
  },
  then: actions([Requesting.respond, { request, itinerary: itineraryDoc }]),
});

// Query: get all events for an itinerary
export const GetAllEventsForItinerary: Sync = (
  { request, itinerary, events },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getAllEventsForItinerary", itinerary },
    { request },
  ]),
  where: async (frames) => {
    // Fetch events array (unwrap the concept response) and then, for any
    // event that has a `poll` id, fetch the poll document and attach it as
    // `pollDoc` inside the event object so the response includes poll data.
    const res = await frames.query(
      async ({ itinerary }) => {
        // PlanItinerary._getAllEventsForItinerary returns either
        // { events: EventDoc[] } or { error: string }. Normalize to always
        // bind an array to `events` so downstream logic can iterate safely.
        const resp = await PlanItinerary._getAllEventsForItinerary({
          itinerary,
        }) as { events?: Array<Record<string, unknown>>; error?: string };
        const evs = resp.events ?? [];
        return [{ events: evs }];
      },
      { itinerary },
      { events },
    );

    // For each frame, fetch polls for events that include a poll id and attach
    // pollDoc to each event entry.
    const enhanced = await res.query(
      async ({ events }) => {
        const evs = events as unknown as Array<Record<string, unknown>>;
        if (!Array.isArray(evs)) return [{ events: [] }];
        const updated: Array<Record<string, unknown>> = [];
        for (const e of evs) {
          if (e && typeof e === "object" && typeof e.poll === "string") {
            const pd = await Polling._getPoll({
              poll: e.poll as unknown as ID,
            });
            (e as Record<string, unknown>).pollDoc = pd.poll;
          }
          updated.push(e);
        }
        return [{ events: updated }];
      },
      { events },
      { events },
    );

    return enhanced;
  },
  then: actions([Requesting.respond, { request, events }]),
});

// Query: get approved events for an itinerary
export const GetApprovedEventsForItinerary: Sync = (
  { request, itinerary, approvedEvents },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getApprovedEventsForItinerary", itinerary },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ itinerary }) => [
        {
          approvedEvents: await PlanItinerary._getApprovedEventsForItinerary({
            itinerary,
          }),
        },
      ],
      { itinerary },
      { approvedEvents },
    );
  },
  then: actions([Requesting.respond, { request, approvedEvents }]),
});

// Query: get event by id
export const GetEventById: Sync = ({ request, event, eventDoc }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getEventById", event },
    { request },
  ]),
  where: async (frames) => {
    // Fetch the event doc and, if it has a `poll` id, fetch that poll and
    // attach the full poll document as `pollDoc` inside the returned event.
    const res = await frames.query(
      async ({ event }) => {
        // _getEventById returns { event?: EventDoc; error?: string }
        const resp = await PlanItinerary._getEventById({ event }) as {
          event?: Record<string, unknown>;
          error?: string;
        };
        const ed = resp.event ?? null;
        return [{ event: ed }];
      },
      { event },
      { event: eventDoc },
    );

    const enhanced = await res.query(
      async ({ event }) => {
        const ed = event as unknown as Record<string, unknown> | null;
        if (!ed) return [{ event: ed }];

        // If the event already has a poll id, fetch and attach the poll doc.
        if (typeof ed.poll === "string") {
          const pd = await Polling._getPoll({ poll: ed.poll as unknown as ID });
          const merged = {
            ...(ed as Record<string, unknown>),
            pollDoc: pd.poll,
          };
          return [{ event: merged }];
        }

        // Race mitigation: if the event does not have a `poll` field yet, the
        // Polling concept may have created a poll using the canonical name
        // `event-<eventId>`. Try to look up that poll by name; if found,
        // persist the relationship and return an enriched event so the
        // frontend sees the poll within the same request window.
        const eventId = event as unknown as ID;
        const pollName = `event-${eventId}`;
        try {
          const pd = await Polling._getPoll({
            poll: pollName as unknown as ID,
          });
          if (
            pd && pd.poll && (pd.poll as unknown as Record<string, unknown>)._id
          ) {
            const pollId = (pd.poll as unknown as Record<string, unknown>)
              ._id as string;
            // persist the association so future reads also include poll
            await PlanItinerary.attachPollToEvent({
              event: eventId,
              poll: pollId,
            });
            const merged = {
              ...(ed as Record<string, unknown>),
              poll: pollId,
              pollDoc: pd.poll,
            };
            return [{ event: merged }];
          }
        } catch (_e) {
          // ignore lookup errors and fall through to return the raw event
        }

        return [{ event: ed }];
      },
      { event },
      { event: eventDoc },
    );

    return enhanced;
  },
  then: actions([Requesting.respond, { request, event: eventDoc }]),
});

// Map POST /ItineraryPlanner/approveEvent -> PlanItinerary.approveEvent
export const ApproveEventRequest: Sync = (
  { request, event, approved, itinerary, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/approveEvent", event, approved, itinerary },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      PlanItinerary.approveEvent as unknown as InstrumentedAction,
      { event, approved, itinerary },
      { error },
    ];
    return actions(action);
  })(),
});

export const ApproveEventResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/approveEvent" }, {
      request,
    }],
    [PlanItinerary.approveEvent as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const ApproveEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/approveEvent" }, {
      request,
    }],
    [PlanItinerary.approveEvent as unknown as InstrumentedAction, {}, {
      error,
    }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Map POST /ItineraryPlanner/removeEvent -> PlanItinerary.removeEvent
export const RemoveEventRequest: Sync = (
  { request, event, itinerary, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/removeEvent", event, itinerary },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      PlanItinerary.removeEvent as unknown as InstrumentedAction,
      { event, itinerary },
      { error },
    ];
    return actions(action);
  })(),
});

export const RemoveEventResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/removeEvent" }, {
      request,
    }],
    [PlanItinerary.removeEvent as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/removeEvent" }, {
      request,
    }],
    [PlanItinerary.removeEvent as unknown as InstrumentedAction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Defensive fallback: respond with a clear error instead of timing out when the
// request is missing required fields (e.g. frontend called without `itinerary`).
export const GetAllEventsForItinerary_MissingParams: Sync = ({ request }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/_getAllEventsForItinerary" },
    { request },
  ]),
  // If the proper query sync didn't match (because `itinerary` was missing),
  // respond with a helpful error message so the frontend gets a 200 with
  // an error payload instead of a 10s timeout.
  then: actions([Requesting.respond, {
    request,
    error: "Missing required field: itinerary",
  }]),
});

export default [
  CreateItineraryRequest,
  CreateItineraryResponse,
  CreateItineraryResponseError,
  GetItineraryByTrip,
  GetItineraryById,
  GetAllEventsForItinerary,
  GetApprovedEventsForItinerary,
  GetEventById,
  ApproveEventRequest,
  ApproveEventResponse,
  ApproveEventResponseError,
  RemoveEventRequest,
  RemoveEventResponse,
  RemoveEventResponseError,
  GetAllEventsForItinerary_MissingParams,
];
