// GET /api/auth/login?next=/helpdesk
// Startet den OAuth2-Authorization-Code-Flow (mit PKCE) gegen Frappe.
import {
  AuthEnv,
  FLOW_COOKIE,
  frappeEndpoint,
  getRedirectUri,
  pkceChallenge,
  randomString,
  serializeCookie,
  signToken,
} from "./_lib";

export const onRequestGet: PagesFunction<AuthEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";

  const state = randomString(24);
  const verifier = randomString(48);
  const challenge = await pkceChallenge(verifier);
  const redirectUri = getRedirectUri(env, request);

  // State + Verifier signiert in einem kurzlebigen Cookie ablegen
  const flow = await signToken(
    { state, verifier, next, exp: Math.floor(Date.now() / 1000) + 600 },
    env.SESSION_SECRET
  );

  const authorize = new URL(
    frappeEndpoint(env, "/api/method/frappe.integrations.oauth2.authorize")
  );
  authorize.searchParams.set("client_id", env.OAUTH_CLIENT_ID);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", env.OAUTH_SCOPE || "openid all");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": serializeCookie(FLOW_COOKIE, flow, {
        maxAge: 600,
        sameSite: "Lax",
      }),
      "Cache-Control": "no-store",
    },
  });
};
