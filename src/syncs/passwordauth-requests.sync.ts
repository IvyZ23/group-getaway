import { actions, Sync } from "@engine";
import { PasswordAuth as PasswordAuthConcept, Requesting } from "@concepts";

// Map Requesting requests for PasswordAuth queries into the PasswordAuth concept
// queries and respond with the result. This covers frontend calls like
// POST /PasswordAuth/_getUserById and /PasswordAuth/searchUsers.

export const GetUserById: Sync = ({ request, id, _id, username }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuth/_getUserById", id },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ id }) => {
        const res = await PasswordAuthConcept._getUserById({ id });
        // normalize to individual bindings so the respond action returns a flat object
        return [{ _id: res?.id, username: res?.username }];
      },
      { id },
      { _id, username },
    );
  },
  then: actions([Requesting.respond, { request, id: _id, username }]),
});

export const GetUserByUsername: Sync = ({ request, username, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuth/_getUserByUsername", username },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ username }) => {
        const res = await PasswordAuthConcept._getUserByUsername({ username });
        return [{ user: res?.user }];
      },
      { username },
      { user },
    );
  },
  then: actions([Requesting.respond, { request, user }]),
});

export const SearchUsers: Sync = ({ request, query, limit, users }) => ({
  when: actions([
    Requesting.request,
    { path: "/PasswordAuth/searchUsers", query, limit },
    { request },
  ]),
  where: async (frames) => {
    return await frames.query(
      async ({ query, limit }) => {
        const res = await PasswordAuthConcept.searchUsers({ query, limit });
        // res has shape { users: [...] } - return the inner array as the binding
        return [{ users: res?.users || [] }];
      },
      { query, limit },
      { users },
    );
  },
  then: actions([Requesting.respond, { request, users }]),
});

export default [GetUserById, GetUserByUsername, SearchUsers];
