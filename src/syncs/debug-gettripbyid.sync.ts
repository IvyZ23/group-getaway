import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";

// Debug sync: immediately respond to TripPlanning/_getTripById requests
export const DebugGetTripById: Sync = ({ request, ...rest }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/_getTripById" },
    { request },
  ]),
  // Echo back the incoming frame as `debug` and respond immediately.
  then: actions([Requesting.respond, { request, debug: rest }]),
});

export default [DebugGetTripById];
