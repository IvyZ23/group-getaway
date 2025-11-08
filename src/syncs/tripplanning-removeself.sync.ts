import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal RemoveSelf syncs: call TripPlanning.removeSelf and
// respond for both success and error outcomes to avoid Requesting timeouts.

export const RemoveSelfRequest: Sync = ({ request, user, tripId, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/removeSelf", user, tripId },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      TripPlanning.removeSelf as unknown as InstrumentedAction,
      { user, tripId },
      { error },
    ];
    return actions(action);
  })(),
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

export default [RemoveSelfRequest, RemoveSelfResponse, RemoveSelfResponseError];
