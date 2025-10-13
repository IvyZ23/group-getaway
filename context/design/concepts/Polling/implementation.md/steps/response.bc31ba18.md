---
timestamp: 'Mon Oct 13 2025 01:39:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_013932.dfe28e92.md]]'
content_id: bc31ba1875b7ff1c0c4f60917026cda521afbc3bf317f42cd1d733d26cd1d1f2
---

# response:

The concept specification and TypeScript implementation have been updated to include the creator authorization checks as requested.

For actions like `addOption`, `removeOption`, `addUser`, `removeUser`, and `close`, an `actingUser` parameter has been added. The implementation now checks if this `actingUser` is indeed the `creator` of the poll before proceeding with the action. An additional check in `removeUser` prevents the creator from removing themselves.

Here are the updated sections:
