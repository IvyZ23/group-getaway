**concept** PasswordAuthentication

**purpose** provide username/password based registration and authentication.

**principle** After a user registers with a username and password, they can authenticate using the same credentials. Passwords are stored hashed with a salt. Helper functions to hash/verify passwords are internal.

**state**

a set of Users with

- an id User
- a username String
- a passwordHash String (stored as salt:hash)

**public actions**

register(username: String, password: String): { user }

- **requires** username does not already exist
- **effects** creates a new user with a salted+hashed password and returns user id

authenticate(username: String, password: String): { user }

- **requires** username exists and password matches stored hash
- **effects** returns the authenticated user's id

searchUsers(query: String, limit?: Number): { users }

- **requires** none
- **effects** performs a case-insensitive search of usernames and returns up to `limit` matches (default 10)

**internal helpers (implementation detail)**

hashPassword(password: String) -> String

- **effects** returns salted hash string (salt:hash)

verifyPassword(password: String, stored: String) -> Boolean

- **effects** verifies a plaintext password against stored salted hash using timing-safe comparison

**queries**

_getUserByUsername(username: String) -> { user } | Empty

- **effects** returns user id if username exists

_getUserById(id: User) -> { id, username } | Empty

- **effects** returns the user's id and username when found
