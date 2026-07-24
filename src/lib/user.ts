import { ApiError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";

// Identity is now resolved from the server-side session (see src/lib/auth). Every
// Project/Reference/Collection is scoped to a userId, so the whole app is multi-user
// once currentUserId() returns the signed-in user. API routes are wrapped by handler(),
// which turns the 401 ApiError below into a proper Unauthorized response; (app) pages
// are additionally guarded by the (app) layout, which redirects to /login.

/** The signed-in user, or null (used by the layout guard + auth pages). */
export async function getCurrentUser() {
  return getSessionUser();
}

/** The signed-in user's id. Throws 401 if there is no valid session. */
export async function currentUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("You must be signed in.", 401);
  return user.id;
}
