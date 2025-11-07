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

// Map POST /CostSplitting/create -> CostSplitting.create
export const CostSplitting_CreateRequest: Sync = (
  { request, item, cost, expenseId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/create", item, cost },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      CostSplitting.create as unknown as InstrumentedAction,
      { item, cost },
      { expenseId, error },
    ];
    return actions(action);
  })(),
});

export const CostSplitting_CreateResponse: Sync = ({ request, expenseId }) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/create" }, { request }],
    [CostSplitting.create as unknown as InstrumentedAction, {}, { expenseId }],
  ),
  then: actions([Requesting.respond, { request, expenseId }]),
});

export const CostSplitting_CreateResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/create" }, { request }],
    [CostSplitting.create as unknown as InstrumentedAction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Map POST /CostSplitting/remove -> CostSplitting.remove
export const CostSplitting_RemoveRequest: Sync = (
  { request, expenseId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/remove", expenseId },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      CostSplitting.remove as unknown as InstrumentedAction,
      { expenseId },
      { error },
    ];
    return actions(action);
  })(),
});

export const CostSplitting_RemoveResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/remove" }, { request }],
    [CostSplitting.remove as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CostSplitting_RemoveResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/remove" }, { request }],
    [CostSplitting.remove as unknown as InstrumentedAction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Map POST /CostSplitting/updateCost -> CostSplitting.updateCost
export const CostSplitting_UpdateCostRequest: Sync = (
  { request, expenseId, newCost, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/updateCost", expenseId, newCost },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      CostSplitting.updateCost as unknown as InstrumentedAction,
      { expenseId, newCost },
      { error },
    ];
    return actions(action);
  })(),
});

export const CostSplitting_UpdateCostResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/updateCost" }, { request }],
    [CostSplitting.updateCost as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CostSplitting_UpdateCostResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/updateCost" }, { request }],
    [CostSplitting.updateCost as unknown as InstrumentedAction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Map POST /CostSplitting/addContribution -> CostSplitting.addContribution
export const CostSplitting_AddContributionRequest: Sync = (
  { request, userId, expenseId, amount, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/addContribution", userId, expenseId, amount },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      CostSplitting.addContribution as unknown as InstrumentedAction,
      { userId, expenseId, amount },
      { error },
    ];
    return actions(action);
  })(),
});

export const CostSplitting_AddContributionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/addContribution" }, {
      request,
    }],
    [CostSplitting.addContribution as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CostSplitting_AddContributionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/addContribution" }, {
      request,
    }],
    [CostSplitting.addContribution as unknown as InstrumentedAction, {}, {
      error,
    }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Map POST /CostSplitting/updateContribution -> CostSplitting.updateContribution
export const CostSplitting_UpdateContributionRequest: Sync = (
  { request, userId, newAmount, expenseId, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/updateContribution", userId, newAmount, expenseId },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      CostSplitting.updateContribution as unknown as InstrumentedAction,
      { userId, newAmount, expenseId },
      { error },
    ];
    return actions(action);
  })(),
});

export const CostSplitting_UpdateContributionResponse: Sync = (
  { request },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/updateContribution" }, {
      request,
    }],
    [CostSplitting.updateContribution as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const CostSplitting_UpdateContributionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/CostSplitting/updateContribution" }, {
      request,
    }],
    [CostSplitting.updateContribution as unknown as InstrumentedAction, {}, {
      error,
    }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Query mappings for expense retrievals
export const CostSplitting_GetExpense: Sync = (
  { request, expenseId, expense },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/_getExpense", expenseId },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async (
        { expenseId },
      ) => [{ expense: await CostSplitting._getExpense({ expenseId }) }],
      { expenseId },
      { expense },
    );
  },
  then: actions([Requesting.respond, { request, expense }]),
});

export const CostSplitting_GetTotalContributions: Sync = (
  { request, expenseId, total },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/_getTotalContributions", expenseId },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async (
        { expenseId },
      ) => [{
        total: await CostSplitting._getTotalContributions({ expenseId }),
      }],
      { expenseId },
      { total },
    );
  },
  then: actions([Requesting.respond, { request, total }]),
});

export const CostSplitting_GetUserContribution: Sync = (
  { request, userId, expenseId, amount },
) => ({
  when: actions([
    Requesting.request,
    { path: "/CostSplitting/_getUserContribution", userId, expenseId },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async (
        { userId, expenseId },
      ) => [{
        amount: await CostSplitting._getUserContribution({ userId, expenseId }),
      }],
      { userId, expenseId },
      { amount },
    );
  },
  then: actions([Requesting.respond, { request, amount }]),
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

// Map POST /Polling/addUser -> Polling.addUser
export const Polling_AddUserRequest: Sync = (
  { request, actingUser, poll, userToAdd, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Polling/addUser", actingUser, poll, userToAdd },
    { request },
  ]),
  then: (() => {
    const action: ActionList = [
      Polling.addUser as unknown as InstrumentedAction,
      { actingUser, poll, userToAdd },
      { error },
    ];
    return actions(action);
  })(),
});

export const Polling_AddUserResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Polling/addUser" }, { request }],
    [Polling.addUser as unknown as InstrumentedAction, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

export const Polling_AddUserResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Polling/addUser" }, { request }],
    [Polling.addUser as unknown as InstrumentedAction, {}, { error }],
  ),
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
  Polling_AddUserRequest,
  Polling_AddUserResponseSuccess,
  Polling_AddUserResponseError,
];
