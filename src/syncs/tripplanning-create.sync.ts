import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal CreateTrip syncs: trigger TripPlanning.create and respond for
// success and error paths to avoid Requesting timeouts.

export const CreateTripRequest: Sync = (
  { request, owner, destination, dateRange, name, user, tripId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/create", owner, destination, dateRange, name, user },
    { request },
  ]),
  // If the caller supplied `user` instead of `owner`, resolve owner from user
  // so the TripPlanning.create action receives an `owner` param.
  where: (frames) =>
    frames.map((f) => {
      const frame = f as Record<symbol, unknown>;
      const resolvedOwner = frame[owner] ?? frame[user];
      return { ...f, [owner]: resolvedOwner } as Record<symbol, unknown>;
    }),
  then: (() => {
    const action: ActionList = [
      TripPlanning.create as unknown as InstrumentedAction,
      { owner, destination, dateRange, name },
      { tripId, error },
    ];
    return actions(action);
  })(),
});

export const CreateTripResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/create" }, { request }],
    [TripPlanning.create, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CreateTripResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/create" }, { request }],
    [TripPlanning.create, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [CreateTripRequest, CreateTripResponse, CreateTripResponseError];
