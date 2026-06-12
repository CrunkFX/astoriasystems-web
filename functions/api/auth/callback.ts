// GET /api/auth/callback?code=...&state=...
// Tauscht den Authorization-Code gegen ein Token, lädt das
// OIDC-Profil und setzt eine signierte Website-Session.
import {
  AuthEnv,
  FLOW_COOKIE,
  SESSION_COOKIE,
  frappeEndpoint,
  getRedirectUri,
  parseCookies,
  serializeCookie,
  signToken,
  verifyToken,
} from "./_lib";

interface FlowState {
  state: string;
  verifier: string;
  next: string;
}

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const clearFlow = serializeCookie(FLOW_COOKIE, "", { maxAge: 0 });

  if (error) {
    return redirectHome(`/?login_error=${encodeURIComponent(error)}`, clearFlow);
  }
  if (!code || !state) {
    return redirectHome("/?login_error=missing_code", clearFlow);
  }

  // Flow-Cookie prüfen (CSRF-Schutz via state)
  const cookies = parseCookies(request.headers.get("Cookie"));
  const flow = await verifyToken<FlowState>(cookies[FLOW_COOKIE], env.SESSION_SECRET);
  if (!flow || flow.state !== state) {
    return redirectHome("/?login_error=invalid_state", clearFlow);
  }

  // Code -> Token
  const tokenRes = await fetch(
    frappeEndpoint(env, "/api/method/frappe.integrations.oauth2.get_token"),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(env, request),
        client_id: env.OAUTH_CLIENT_ID,
        client_secret: env.OAUTH_CLIENT_SECRET,
        code_verifier: flow.verifier,
      }),
    }
  );

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return redirectHome("/?login_error=token_exchange", clearFlow);
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) {
    return redirectHome("/?login_error=no_token", clearFlow);
  }

  // OIDC-Profil laden
  const profileRes = await fetch(
    frappeEndpoint(env, "/api/method/frappe.integrations.oauth2.openid_profile"),
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );
  if (!profileRes.ok) {
    console.error("Profile fetch failed:", await profileRes.text());
    return redirectHome("/?login_error=profile", clearFlow);
  }
  const profile = (await profileRes.json()) as Record<string, unknown>;

  const ttl = parseInt(env.SESSION_TTL || "86400", 10);
  const session = await signToken(
    {
      sub: profile.sub ?? profile.email,
      email: profile.email,
      name: profile.name ?? profile.given_name ?? profile.email,
      picture: profile.picture,
      exp: Math.floor(Date.now() / 1000) + ttl,
    },
    env.SESSION_SECRET
  );

  // sichere Weiterleitung: nur seiteninterne Pfade zulassen
  const next = flow.next && flow.next.startsWith("/") ? flow.next : "/";

  return new Response(null, {
    status: 302,
    headers: [
      ["Location", next],
      ["Cache-Control", "no-store"],
      ["Set-Cookie", clearFlow],
      [
        "Set-Cookie",
        serializeCookie(SESSION_COOKIE, session, { maxAge: ttl, sameSite: "Lax" }),
      ],
    ],
  });
};

function redirectHome(location: string, clearCookie: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Set-Cookie": clearCookie, "Cache-Control": "no-store" },
  });
}
