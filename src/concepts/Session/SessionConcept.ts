import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

const PREFIX = "Sessions.";
type SessionID = ID;

interface SessionDoc {
  _id: SessionID;
  user: ID;
  expiresAt?: Date;
}

export default class SessionConcept {
  private sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * create ({ user, ttlSeconds }) => { session }
   */
  async create({ user, ttlSeconds }: { user: ID; ttlSeconds?: number }) {
    const session = freshID() as SessionID;
    const doc: SessionDoc = { _id: session, user };
    if (ttlSeconds) doc.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.sessions.insertOne(doc);
    return { session };
  }

  /**
   * validate ({ session }) => { user } | {}
   */
  async validate({ session }: { session: SessionID }) {
    const doc = await this.sessions.findOne({ _id: session });
    if (!doc) return {};
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
      await this.sessions.deleteOne({ _id: session }).catch(() => {});
      return {};
    }
    return { user: doc.user };
  }

  /**
   * destroy ({ session }) => { ok: true }
   */
  async destroy({ session }: { session: SessionID }) {
    await this.sessions.deleteOne({ _id: session }).catch(() => {});
    return { ok: true };
  }
}
