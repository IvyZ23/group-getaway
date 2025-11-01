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
  "/api/PasswordAuth/hashPassword",
  "/api/PasswordAuth/verifyPassword",
  "/api/PasswordAuth/_getUserByUsername",
  "/api/PasswordAuth/_getUserById",
  "/api/PasswordAuth/searchUsers",
  "/api/Polling/create",
  "/api/Polling/addOption",
  "/api/Polling/removeOption",
  "/api/Polling/addUser",
  "/api/Polling/removeUser",
  "/api/Polling/addVote",
  "/api/Polling/updateVote",
  "/api/Polling/close",
  "/api/Polling/getResult",
  "/api/Polling/_getPoll",
  "/api/Polling/_getUserVote",
  "/api/Polling/_getVotesForPoll",
  "/api/TripPlanning/create",
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
];
