import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";

const PREFIX = "Sessions" + ".";

type Session = ID;
type User = ID;

interface SessionDoc {
  _id: Session;
  user: User;
  createdAt: Date;
  expiresAt: Date;
}

export default class SessionConcept {
  private sessions: Collection<SessionDoc>;
  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * create ({ user }): { session }
   * creates a server-side session tied to a user id
   */
  async create({ user, ttlSeconds = 60 * 60 * 24 * 7 }: { user: User; ttlSeconds?: number }): Promise<{ session: Session }> {
    const id = freshID() as Session;
    const now = new Date();
    const doc: SessionDoc = { _id: id, user, createdAt: now, expiresAt: new Date(now.getTime() + ttlSeconds * 1000) };
    await this.sessions.insertOne(doc);
    return { session: id };
  }

  /**
   * validate ({ session }): { user } | {}
   * returns the user id if session exists and is not expired
   */
  async validate({ session }: { session: Session }): Promise<{ user?: User } | Empty> {
    const doc = await this.sessions.findOne({ _id: session });
    if (!doc) return {};
    if (doc.expiresAt.getTime() < Date.now()) {
      // expired: remove it
      await this.sessions.deleteOne({ _id: session });
      return {};
    }
    return { user: doc.user };
  }

  /**
   * destroy ({ session }): Empty
   */
  async destroy({ session }: { session: Session }): Promise<Empty> {
    await this.sessions.deleteOne({ _id: session });
    return {} as Empty;
  }
}
