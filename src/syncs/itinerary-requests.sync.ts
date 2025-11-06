import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { ItineraryPlanner as PlanItinerary, Requesting } from "@concepts";

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
    return await frames.query(
      async ({ itinerary }) => [
        {
          events: await PlanItinerary._getAllEventsForItinerary({ itinerary }),
        },
      ],
      { itinerary },
      { events },
    );
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
    return await frames.query(
      async ({ event }) => [
        { event: await PlanItinerary._getEventById({ event }) },
      ],
      { event },
      { event: eventDoc },
    );
  },
  then: actions([Requesting.respond, { request, event: eventDoc }]),
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
  GetAllEventsForItinerary_MissingParams,
];
