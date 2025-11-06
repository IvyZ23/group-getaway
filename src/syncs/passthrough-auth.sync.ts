import { actions, Sync } from "@engine";
import { Requesting } from "@concepts";
import { exclusions } from "@concepts/Requesting/passthrough.ts";

// Ensure that excluded passthrough routes require a logged in user.
// If a request is for an excluded route and no server-verified `user` is present,
// respond immediately with an unauthorized response so the request does not
// continue to other synchronizations or get processed as an unauthenticated action.
export const PassthroughAuth: Sync = ({ request, path, user }) => ({
  when: actions([
    // Match any incoming Requesting.request and capture the path, request id,
    // and (if present) the verified user so we can enforce auth for excluded
    // passthrough routes. The `user` binding must be included in the input
    // pattern so it becomes available in `frames` for the `where` clause.
    Requesting.request,
    { path, user },
    { request },
  ]),
  where: (frames) => {
    // Determine base path (Requesting.request paths are documented as not
    // including the base - i.e. they look like `/LikertSurvey/createSurvey`).
    const base = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";

    // Keep only frames where the path corresponds to an excluded passthrough
    // route and there is no verified `user` attached to the inputs.
    return frames.filter(($) => {
      const p = $[path] as unknown as string;
      if (typeof p !== "string") return false;
      const full = `${base}${p}`;
      const isExcluded = exclusions.includes(full) || exclusions.includes(p);
      const hasUser = Boolean($[user]);
      return isExcluded && !hasUser;
    });
  },
  then: actions([
    // Short-circuit the request with an unauthorized response. We include a
    // status field so callers can inspect it; the HTTP layer will return the
    // JSON body as-is.
    Requesting.respond,
    { request, error: "Unauthorized", status: 401 },
  ]),
});
