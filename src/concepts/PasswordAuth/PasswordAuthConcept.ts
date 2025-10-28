import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

const PREFIX = "PasswordAuthentication.";
type User = ID;

interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string; // stored as salt:hash
}

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Hashes a password with a random salt.
   */
  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + password).digest("hex");
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a plaintext password against a stored hash.
   */
  private verifyPassword(password: string, stored: string): boolean {
    const [salt, storedHash] = stored.split(":");
    const hash = createHash("sha256").update(salt + password).digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(storedHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Register a new user.
   */
  async register({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    const passwordHash = this.hashPassword(password);

    const newUser: UserDoc = {
      _id: freshID() as User,
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * Authenticate an existing user.
   */
  async authenticate({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    const userDoc = await this.users.findOne({ username });
    if (!userDoc) return { error: "Invalid credentials." };

    const valid = this.verifyPassword(password, userDoc.passwordHash);
    if (!valid) return { error: "Invalid credentials." };

    return { user: userDoc._id };
  }

  /**
   * Internal query to get a user by username.
   */
  async _getUserByUsername({
    username,
  }: {
    username: string;
  }): Promise<{ user: User } | Empty> {
    const userDoc = await this.users.findOne({ username });
    return userDoc ? { user: userDoc._id } : {};
  }

  /**
   * Internal query to get a user by id.
   * Returns both id and username when found.
   */
  async _getUserById({
    id,
  }: {
    id: User;
  }): Promise<{ id: User; username: string } | Empty> {
    const userDoc = await this.users.findOne({ _id: id });
    return userDoc ? { id: userDoc._id, username: userDoc.username } : {};
  }

  /**
   * Search for users by (partial) username match.
   * Performs a case-insensitive search.
   */
  async searchUsers({
    query,
    limit = 10,
  }: {
    query: string;
    limit?: number;
  }): Promise<{ users: { id: User; username: string }[] }> {
    // Build a case-insensitive regex pattern
    const regex = new RegExp(query, "i");

    const results = await this.users
      .find({ username: { $regex: regex } })
      .limit(limit)
      .project({ _id: 1, username: 1 })
      .toArray();

    // Format for clean API response
    const users = results.map((u) => ({
      id: u._id,
      username: u.username,
    }));

    return { users };
  }
}
