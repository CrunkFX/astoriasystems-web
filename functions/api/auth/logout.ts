// GET /api/auth/logout
// Löscht die Website-Session. Optional kann zusätzlich die
// zentrale Frappe-Session beendet werden (siehe FRAPPE_LOGOUT).
import { AuthEnv, SESSION_COOKIE, frappeEndpoint, serializeCookie } from "./_lib";

// Auf true setzen, wenn der Logout auch die Frappe-Portal-Session
// (Helpdesk/Wiki) beenden soll. Der Browser wird dann zu Frappe
// geleitet und kehrt danach zurück.
const FRAPPE_LOGOUT = false;

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/";

  const clear = serializeCookie(SESSION_COOKIE, "", { maxAge: 0 });

  const location = FRAPPE_LOGOUT
    ? frappeEndpoint(env, "/api/method/logout")
    : safeNext;

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": clear,
      "Cache-Control": "no-store",
    },
  });
};
