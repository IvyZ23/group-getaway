import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";

// Debug-only sync: echo incoming Requesting frame keys/values for
// /TripPlanning/updateParticipant. This helps determine which symbols are
// present so we can write precise `when` bindings and avoid missing-binding
// errors. Safe to leave in place; it responds immediately to avoid timeouts.

export const DebugUpdateParticipant: Sync = ({ request, ...rest }) => ({
  when: actions([Requesting.request, {
    path: "/TripPlanning/updateParticipant",
  }, { request }]),
  then: actions([Requesting.respond, { request, debug: rest }]),
});

export default [DebugUpdateParticipant];
