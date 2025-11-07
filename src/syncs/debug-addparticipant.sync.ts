import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";

// Debug sync: immediately respond to TripPlanning/addParticipant requests
export const DebugAddParticipant: Sync = ({ request, ...rest }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/addParticipant" },
    { request },
  ]),
  then: actions([Requesting.respond, { request, debug: rest }]),
});

export default [DebugAddParticipant];
