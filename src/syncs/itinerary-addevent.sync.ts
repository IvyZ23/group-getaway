import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { ItineraryPlanner as PlanItinerary, Requesting } from "@concepts";

// Handle POST /ItineraryPlanner/addEvent from the frontend. Map the
// Requesting.request into the instrumented PlanItinerary.addEvent action and
// always respond (success or error) so the client doesn't hit the 10s timeout.

export const AddEventRequest: Sync = (
  { request, name, cost, itinerary, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/addEvent", name, cost, itinerary },
    { request },
  ]),
  // We intentionally don't require `user` in the `when` so requests without a
  // verified session still match; the server's pasthrough attaches `user` to
  // the body when a session is present, so it will be available to subsequent
  // concept logic if needed.
  then: (() => {
    const action: ActionList = [
      PlanItinerary.addEvent as unknown as InstrumentedAction,
      { name, cost, itinerary },
      { error },
    ];
    return actions(action);
  })(),
});

export const AddEventResponse: Sync = ({ request, event }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/addEvent" }, { request }],
    [PlanItinerary.addEvent, {}, { event }],
  ),
  then: actions([Requesting.respond, { request, event }]),
});

export const AddEventResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/ItineraryPlanner/addEvent" }, { request }],
    [PlanItinerary.addEvent, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Defensive fallback: if the request didn't include required fields, respond
// with a helpful error instead of leaving the Requesting request pending.
export const AddEvent_MissingParams: Sync = ({ request }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/addEvent" },
    { request },
  ]),
  then: actions([Requesting.respond, {
    request,
    error: "Missing required fields: name,cost,itinerary",
  }]),
});

export default [
  AddEventRequest,
  AddEventResponse,
  AddEventResponseError,
  AddEvent_MissingParams,
];
