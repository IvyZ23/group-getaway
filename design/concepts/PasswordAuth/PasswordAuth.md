**concept** PasswordAuthentication

**purpose** limit access to known users and limit acccess each user has

**principle** after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user

**state**

a set of Users with

-   a username String
-   a password String

**actions**

verifyPassword (password: String, stored: String)

-   **effects** compares inputted password with actual password. Returns true if they match, false otherwise.

hashPassword (password: String)

-   **effects** hashes the password

register (username: String, password: String): (user: User)

-   **requires** username does not already exist
-   **effects** creates new user

authenticate (username: String, password: String): (user: User)

-   **requires** user with username and password to exists
-   **effects** returns that user
