---
timestamp: 'Sun Oct 12 2025 17:19:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_171926.0c232949.md]]'
content_id: ee12edbdbe8550d5329245b25168f2e9fe8784e39ed672a1dfd364db1b3a0b61
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

User passwords should be hashed before being stored away.
