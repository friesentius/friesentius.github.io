// Contact-email Worker: hands out the owner's address only after a Cloudflare
// Turnstile check passes. Pure request handling with an injectable `fetch`, so
// the verify, hostname and CORS logic is unit-testable without a runtime.

export interface Env {
  /** Turnstile widget secret key (Worker secret). */
  TURNSTILE_SECRET?: string;
  /** The address to reveal (Worker secret). Never stored in the repository. */
  CONTACT_EMAIL?: string;
}

/** Hostnames the site is served from; also what Turnstile must report back. */
export const ALLOWED_HOSTNAMES: readonly string[] = [
  'friesentius.github.io',
  'friesentius.com',
  'www.friesentius.com',
  'localhost',
];

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;
const MAX_BODY_BYTES = 4096;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * The origin to echo in CORS headers, or null when it is not allowed. Real
 * hosts need https; only localhost (any port) may use plain http.
 */
export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (!ALLOWED_HOSTNAMES.includes(url.hostname)) return null;
  if (url.hostname === 'localhost') return url.protocol === 'http:' ? origin : null;
  return url.protocol === 'https:' && url.port === '' ? origin : null;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(origin ? corsHeaders(origin) : { Vary: 'Origin' }),
    },
  });
}

interface SiteverifyResponse {
  success?: boolean;
  hostname?: string;
}

/** Asks Cloudflare whether the token is genuine, unused and for one of our hostnames. */
export async function verifyToken(
  token: string,
  secret: string,
  remoteIp: string | null,
  fetchImpl: Fetch,
): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);
  const res = await fetchImpl(SITEVERIFY_URL, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`siteverify returned ${res.status}`);
  const result = (await res.json()) as SiteverifyResponse;
  return (
    result.success === true &&
    typeof result.hostname === 'string' &&
    ALLOWED_HOSTNAMES.includes(result.hostname)
  );
}

async function readToken(request: Request): Promise<string | null> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(text) as { token?: unknown };
    const token = body?.token;
    return typeof token === 'string' && token.length > 0 && token.length <= MAX_TOKEN_LENGTH
      ? token
      : null;
  } catch {
    return null;
  }
}

export async function handleRequest(
  request: Request,
  env: Env,
  fetchImpl: Fetch = fetch,
): Promise<Response> {
  const origin = allowedOrigin(request.headers.get('Origin'));

  if (request.method === 'OPTIONS') {
    return origin
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : new Response(null, { status: 403 });
  }
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin);
  if (!origin) return json({ error: 'origin not allowed' }, 403, null);

  if (!env.TURNSTILE_SECRET || !env.CONTACT_EMAIL) {
    return json({ error: 'not configured' }, 500, origin);
  }

  const token = await readToken(request);
  if (!token) return json({ error: 'missing token' }, 400, origin);

  let ok: boolean;
  try {
    ok = await verifyToken(
      token,
      env.TURNSTILE_SECRET,
      request.headers.get('CF-Connecting-IP'),
      fetchImpl,
    );
  } catch {
    return json({ error: 'verification unavailable' }, 502, origin);
  }
  if (!ok) return json({ error: 'verification failed' }, 403, origin);

  return json({ email: env.CONTACT_EMAIL }, 200, origin);
}
