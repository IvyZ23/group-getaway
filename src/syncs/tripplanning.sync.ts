import { actions, Sync } from "@engine";
import { Requesting, TripPlanning } from "@concepts";

// Single sync: when a Requesting.request arrives for /TripPlanning/_getTripsByUser
// with an `owner`, run the TripPlanning query and respond with the results.
export const GetTripsByUser: Sync = ({ request, owner, trips }) => ({
  when: actions([
    Requesting.request,
    { path: "/TripPlanning/_getTripsByUser", owner },
    { request },
  ]),
  where: async (frames) => {
    // Execute the query and bind its result to `trips`.
    return await frames.query(
      async (
        { owner },
      ) => [{ trips: await TripPlanning._getTripsByUser({ owner }) }],
      { owner },
      { trips },
    );
  },
  then: actions([Requesting.respond, { request, trips }]),
});
