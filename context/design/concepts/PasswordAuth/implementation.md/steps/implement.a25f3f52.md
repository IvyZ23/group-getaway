---
timestamp: 'Sun Oct 12 2025 17:32:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_173245.5534747b.md]]'
content_id: a25f3f5286d926109dcce0a904b83d8242820abb871ca89717f8c4ffd1f32340
---

# implement: UserAuthentication

**concept** PasswordAuthentication

**purpose** limit access to known users and limit acccess each user has

**principle** after a user registers with a username and a password,
they can authenticate with that same username and password
and be treated each time as the same user

**state**

a set of Users with

* a username String
* a password String

**actions**

register (username: String, password: String): (user: User)

* **requires** username does not already exist
* **effects** creates new user

authenticate (username: String, password: String): (user: User)

* **requires** user with username and password to exists
* **effects** returns that user

User passwords should be hashed before being stored away. Can you use the node:crypto module has a function to do this? https://docs.deno.com/api/node/crypto/~/hash
