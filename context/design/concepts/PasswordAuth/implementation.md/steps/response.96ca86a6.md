---
timestamp: 'Sun Oct 12 2025 17:19:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_171937.1062514b.md]]'
content_id: 96ca86a6577def702910e99bce15ffd7714c8dcba6dcca4e1bbe5f5b78632ccc
---

# response:

```typescript
// file: src/PasswordAuthentication/PasswordAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import * as bcrypt from "npm:bcrypt"; // For password hashing
import { ID, Empty } from "../../utils/types.ts"; // Adjust path as per your project structure
import { freshID } from "../../utils/database.ts"; // Adjust path as per your project structure

// Declare collection prefix, use concept name
const PREFIX = "PasswordAuthentication.";

// Generic types of this concept
type User = ID;

/**
 * Represents a user document stored in the database.
 *
 * State:
 * a set of Users with
 *   a username String
 *   a password String (hashed)
 */
interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string; // Stores the hashed password
}

/**
 * concept PasswordAuthentication
 *
 * purpose: limit access to known users and limit access each user has
 */
export default class PasswordAuthenticationConcept {
  private users: Collection<UserDoc>;
  private readonly saltRounds = 10; // For bcrypt hashing

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * action: register (username: String, password: String): (user: User)
   *
   * principle: after a user registers with a username and a password,
   * they can authenticate with that same username and password
   * and be treated each time as the same user
   *
   * requires: username does not already exist
   * effects: creates new user
   */
  async register({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    // Check precondition: username does not already exist
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Create new user
    const newUser: UserDoc = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);

    // Return the new user's ID
    return { user: newUser._id };
  }

  /**
   * action: authenticate (username: String, password: String): (user: User)
   *
   * requires: user with username and password to exists
   * effects: returns that user
   */
  async authenticate({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    // Find the user by username
    const userDoc = await this.users.findOne({ username });

    // Check precondition: user with username exists
    if (!userDoc) {
      return { error: "Invalid credentials." };
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, userDoc.passwordHash);

    // Check precondition: password matches
    if (!isPasswordValid) {
      return { error: "Invalid credentials." };
    }

    // Return the authenticated user's ID
    return { user: userDoc._id };
  }

  /**
   * query: _getUserByUsername(username: String): (user: User)
   *
   * effects: Returns the user ID associated with a given username, if found.
   * This is a utility query for internal use or testing.
   */
  async _getUserByUsername({
    username,
  }: {
    username: string;
  }): Promise<{ user: User } | Empty> {
    const userDoc = await this.users.findOne({ username });
    if (userDoc) {
      return { user: userDoc._id };
    }
    return {};
  }
}
```
