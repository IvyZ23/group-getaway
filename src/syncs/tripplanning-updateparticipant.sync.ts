import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import { Requesting, TripPlanning } from "@concepts";

// Minimal UpdateParticipant syncs: forward request to TripPlanning.updateParticipant
// and ensure Requesting.respond is called for both success and error outcomes.

// Owner-driven update: owner may update any participant
export const UpdateParticipantRequest_Owner: Sync = (
  { request, owner, tripId, participantUser, budget, error },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TripPlanning/updateParticipant",
      owner,
      tripId,
      participantUser,
      budget,
    },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      TripPlanning.updateParticipant as unknown as InstrumentedAction,
      { owner, tripId, participantUser, budget },
      { error },
    ];
    return actions(action);
  })(),
});

// Participant self-update: caller provided as `user` may update their own budget
export const UpdateParticipantRequest_User: Sync = (
  { request, user, tripId, participantUser, budget, error },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TripPlanning/updateParticipant",
      user,
      tripId,
      participantUser,
      budget,
    },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      TripPlanning.updateParticipant as unknown as InstrumentedAction,
      { user, tripId, participantUser, budget },
      { error },
    ];
    return actions(action);
  })(),
});

export const UpdateParticipantResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/updateParticipant" }, {
      request,
    }],
    [TripPlanning.updateParticipant, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const UpdateParticipantResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TripPlanning/updateParticipant" }, {
      request,
    }],
    [TripPlanning.updateParticipant, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export default [
  UpdateParticipantRequest_Owner,
  UpdateParticipantRequest_User,
  UpdateParticipantResponse,
  UpdateParticipantResponseError,
];
