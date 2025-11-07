import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal DeleteTrip syncs: trigger TripPlanning.delete and respond for
// success and error paths to avoid Requesting timeouts.

export const DeleteTripRequest: Sync = ({ request, owner, tripId, user, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/delete", owner, tripId, user },
    { request },
  ]),
  where: (frames) => frames.map((f) => {
    const frame = f as Record<symbol, unknown>;
    const resolvedOwner = frame[owner] ?? frame[user];
    return { ...f, [owner]: resolvedOwner } as Record<symbol, unknown>;
  }),
  then: (() => {
    const action: ActionList = [
      TripPlanning.delete as unknown as InstrumentedAction,
      { owner, tripId },
      { error },
    ];
    return actions(action);
  })(),
});

export const DeleteTripResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/delete" }, { request }],
    [TripPlanning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const DeleteTripResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/delete" }, { request }],
    [TripPlanning.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [DeleteTripRequest, DeleteTripResponse, DeleteTripResponseError];
