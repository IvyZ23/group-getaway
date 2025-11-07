import { actions, Sync } from "@engine";
import type { ActionList, InstrumentedAction } from "../engine/types.ts";
import {
  CostSplitting,
  ItineraryPlanner as PlanItinerary,
  Polling,
  Requesting,
} from "@concepts";

// Defensive/fallback syncs to avoid Requesting timeouts for common missing
// or unhandled request shapes. These respond with helpful error payloads or
// execute the corresponding query/action when safe.

export const ItineraryCreate_MissingTrip: Sync = ({ request }) => ({
  when: actions([
    Requesting.request,
    { path: "/ItineraryPlanner/create" },
    { request },
  ]),
  then: actions([Requesting.respond, {
    request,
    error: "Missing required field: trip",
  }]),
});

export const Polling_GetPoll: Sync = ({ request, poll, pollDoc }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/_getPoll", poll },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ poll }) => [{ pollDoc: await Polling._getPoll({ poll }) }],
      { poll },
      { pollDoc },
    );
  },
  then: actions([Requesting.respond, { request, pollDoc }]),
});

export const CostSplitting_GetExpensesByItem: Sync = (
  { request, item, expenses },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/_getExpensesByItem", item },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async (
        { item },
      ) => [{ expenses: await CostSplitting._getExpensesByItem({ item }) }],
      { item },
      { expenses },
    );
  },
  then: actions([Requesting.respond, { request, expenses }]),
});

// Direct create mapping for Polling.create so frontend calls to /Polling/create
// are handled and the Requesting request is always responded to.
export const Polling_CreateRequest: Sync = ({ request, user, name, poll }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/create", user, name },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      Polling.create as unknown as InstrumentedAction,
      { user, name },
      { poll },
    ];
    return actions(action);
  })(),
});

export const Polling_CreateResponse: Sync = (
  { request, poll, name, event },
) => ({
  // When a Polling.create completes, respond to the original Requesting
  // request and, if the poll name encodes an event id (frontend uses
  // `event-<eventId>`), attach the created poll id to that event document.
  when: actions([
    Requesting.request,
    { path: "/Polling/create" },
    { request },
  ], [Polling.create as unknown as InstrumentedAction, { name }, { poll }]),
  where: (frames) => {
    // Derive event id from poll name when it follows `event-<id>` pattern.
    return frames.map((f) => {
      const frame = f as Record<symbol, unknown>;
      const nm = frame[name] as unknown as string | undefined;
      if (!nm) return f;
      const m = /^event-(.+)$/.exec(nm);
      if (m) {
        return { ...f, [event]: m[1] } as Record<symbol, unknown>;
      }
      return f;
    });
  },
  then: (() => {
    // First respond to the Requesting.request with the poll id. Then, if we
    // derived an `event` symbol in `where`, call PlanItinerary.attachPollToEvent
    // to persist the relationship on the ItineraryPlanner concept. We declare
    // two THEN patterns; the second will only execute when `event` is present
    // on the frame.
    const respond: ActionList = [
      Requesting.respond as unknown as InstrumentedAction,
      { request, poll },
      {},
    ];
    const attach: ActionList = [
      PlanItinerary.attachPollToEvent as unknown as InstrumentedAction,
      { event, poll },
      {},
    ];
    return actions(respond, attach);
  })(),
});

export const Polling_CreateResponseError: Sync = ({ request, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/create" },
    { request },
  ], [Polling.create as unknown as InstrumentedAction, {}, { error }]),
  then: actions([Requesting.respond, { request, error }]),
});

// Map /Polling/addOption requests to the Polling.addOption concept action
export const Polling_AddOptionRequest: Sync = (
  { request, actingUser, poll, label },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/addOption", actingUser, poll, label },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      Polling.addOption as unknown as InstrumentedAction,
      { actingUser, poll, label },
      {},
    ];
    return actions(action);
  })(),
});

export const Polling_AddOptionResponseSuccess: Sync = ({ request }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/addOption" },
    { request },
  ], [Polling.addOption as unknown as InstrumentedAction, {}, {}]),
  then: actions([Requesting.respond, { request }]),
});

export const Polling_AddOptionResponseError: Sync = ({ request, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/addOption" },
    { request },
  ], [Polling.addOption as unknown as InstrumentedAction, {}, { error }]),
  then: actions([Requesting.respond, { request, error }]),
});

export default [
  ItineraryCreate_MissingTrip,
  Polling_GetPoll,
  CostSplitting_GetExpensesByItem,
  Polling_CreateRequest,
  Polling_CreateResponse,
  Polling_CreateResponseError,
  Polling_AddOptionRequest,
  Polling_AddOptionResponseSuccess,
  Polling_AddOptionResponseError,
];
