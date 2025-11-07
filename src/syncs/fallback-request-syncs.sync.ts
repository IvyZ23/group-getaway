import { actions, Sync } from "@engine";
import { Requesting, Polling, CostSplitting } from "@concepts";

// Defensive/fallback syncs to avoid Requesting timeouts for common missing
// or unhandled request shapes. These respond with helpful error payloads or
// execute the corresponding query/action when safe.

export const ItineraryCreate_MissingTrip: Sync = ({ request }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/create" },
    { request },
  ]),
  then: actions([Requesting.respond, { request, error: "Missing required field: trip" }]),
});

export const Polling_GetPoll: Sync = ({ request, poll, pollDoc }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/_getPoll", poll },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(async ({ poll }) => [{ pollDoc: await Polling._getPoll({ poll }) }], { poll }, { pollDoc });
  },
  then: actions([Requesting.respond, { request, pollDoc }]),
});

export const CostSplitting_GetExpensesByItem: Sync = ({ request, item, expenses }) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/_getExpensesByItem", item },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(async ({ item }) => [{ expenses: await CostSplitting._getExpensesByItem({ item }) }], { item }, { expenses });
  },
  then: actions([Requesting.respond, { request, expenses }]),
});

export default [ItineraryCreate_MissingTrip, Polling_GetPoll, CostSplitting_GetExpensesByItem];
