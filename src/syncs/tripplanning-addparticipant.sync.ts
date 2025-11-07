import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal AddParticipant syncs: trigger TripPlanning.addParticipant and
// respond for success and error paths to avoid Requesting timeouts.

export const AddParticipantRequest: Sync = (
  { request, owner, tripId, participantUser, budget, error },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TripPlanning/addParticipant",
      owner,
      tripId,
      participantUser,
      budget,
    },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      TripPlanning.addParticipant as unknown as InstrumentedAction,
      { owner, tripId, participantUser, budget },
      { error },
    ];
    return actions(action);
  })(),
});

export const AddParticipantResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/addParticipant" }, { request }],
    [TripPlanning.addParticipant, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const AddParticipantResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/addParticipant" }, { request }],
    [TripPlanning.addParticipant, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [
  AddParticipantRequest,
  AddParticipantResponse,
  AddParticipantResponseError,
];
