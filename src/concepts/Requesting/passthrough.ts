/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",

  "/api/PasswordAuth/register": "allow users to register",
  "/api/PasswordAuth/authenticate": "allow users to login",

  "/api/Requestings/request": "requests are public",
  "/api/Requestings/respond": "requests are public",
  "/api/Requestings/_awaitResponse": "requests are public",

  "/api/Session/create": "sessions for auth",
  "/api/Session/validate": "sessions for auth",
  "/api/Session/destroy": "sessions for auth",

  "/api/TripPlanning/create": "anyone can create a trip",

  "/api/Polling/create": "polling can be public",
  "/api/Polling/addVote": "polling can be public",
  "/api/Polling/updateVote": "polling can be public",
  "/api/Polling/close": "polling can be public",
  "/api/Polling/getResult": "polling can be public",
  "/api/Polling/_getPoll": "polling can be public",
  "/api/Polling/_getUserVote": "polling can be public",
  "/api/Polling/_getVotesForPoll": "polling can be public",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",

  "/api/CostSplitting/create",
  "/api/CostSplitting/remove",
  "/api/CostSplitting/addContribution",
  "/api/CostSplitting/updateContribution",
  "/api/CostSplitting/_getExpense",
  "/api/CostSplitting/_getExpensesByItem",
  "/api/CostSplitting/_getTotalContributions",
  "/api/CostSplitting/_getUserContribution",
  "/api/CostSplitting/updateCost",

  "/api/ItineraryPlanner/checkItineraryNotFinalized",
  "/api/ItineraryPlanner/create",
  "/api/ItineraryPlanner/addEvent",
  "/api/ItineraryPlanner/updateEvent",
  "/api/ItineraryPlanner/approveEvent",
  "/api/ItineraryPlanner/removeEvent",
  "/api/ItineraryPlanner/finalizeItinerary",
  "/api/ItineraryPlanner/_getItineraryByTrip",
  "/api/ItineraryPlanner/_getItineraryById",
  "/api/ItineraryPlanner/_getAllEventsForItinerary",
  "/api/ItineraryPlanner/_getApprovedEventsForItinerary",
  "/api/ItineraryPlanner/_getEventById",
  "/api/ItineraryPlanner/attachPollToEvent",

  "/api/PasswordAuth/hashPassword",
  "/api/PasswordAuth/verifyPassword",
  "/api/PasswordAuth/_getUserByUsername",
  "/api/PasswordAuth/_getUserById",
  "/api/PasswordAuth/searchUsers",

  "/api/TripPlanning/update",
  "/api/TripPlanning/finalize",
  "/api/TripPlanning/delete",
  "/api/TripPlanning/addParticipant",
  "/api/TripPlanning/updateParticipant",
  "/api/TripPlanning/removeParticipant",
  "/api/TripPlanning/removeSelf",
  "/api/TripPlanning/_getTripById",
  "/api/TripPlanning/_getTripsByUser",
  "/api/TripPlanning/_getParticipantsInTrip",

  "/api/Polling/addOption",
  "/api/Polling/removeOption",
  "/api/Polling/addUser",
  "/api/Polling/removeUser",
];
