import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal RemoveParticipant syncs: call TripPlanning.removeParticipant and
// respond for both success and error outcomes to avoid Requesting timeouts.

export const RemoveParticipantRequest: Sync = (
  { request, owner, tripId, participantUser, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/removeParticipant", owner, tripId, participantUser },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      TripPlanning.removeParticipant as unknown as InstrumentedAction,
      { owner, tripId, participantUser },
      { error },
    ];
    return actions(action);
  })(),
});

export const RemoveParticipantResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeParticipant" }, {
      request,
    }],
    [TripPlanning.removeParticipant, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const RemoveParticipantResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/removeParticipant" }, {
      request,
    }],
    [TripPlanning.removeParticipant, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [
  RemoveParticipantRequest,
  RemoveParticipantResponse,
  RemoveParticipantResponseError,
];
