// GET /api/auth/me
// Liefert den aktuellen Login-Status für die Website (Header,
// "Hallo <Name>", Portal-Link). Liest nur das signierte
// Session-Cookie – kein Frappe-Roundtrip nötig.
import { AuthEnv, SESSION_COOKIE, parseCookies, verifyToken } from "./_lib";

interface Session {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const session = await verifyToken<Session>(cookies[SESSION_COOKIE], env.SESSION_SECRET);

  const body = session
    ? { loggedIn: true, name: session.name, email: session.email, picture: session.picture }
    : { loggedIn: false };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
    },
  });
};
