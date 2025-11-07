import { Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { getDb } from "@utils/database.ts";

/**
 * Lightweight concept to host small instrumented actions used by syncs.
 * We keep attachPollToEvent here so the DB update is not an action on
 * the ItineraryPlanner concept itself (per request).
 */
export default class SyncHelpersConcept {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async attachPollToEvent(
    { event, poll }: { event: ID; poll: string },
  ): Promise<Empty | { error: string }> {
    try {
      const events = this.db.collection("PlanItinerary.events");
      const result = await events.updateOne({ _id: event }, { $set: { poll } });
      if (result.matchedCount === 0) {
        return { error: `Event ${event} not found.` };
      }
      return {} as Empty;
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
}
