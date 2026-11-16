// Contact-email reveal logic, free of DOM access so it is unit-testable.
// The address itself is never in the site: the browser sends a Cloudflare
// Turnstile token to the Worker in `worker/`, which returns it after
// verifying the token.

export interface EmailConfig {
  sitekey: string;
  workerUrl: string;
}

/**
 * The reveal needs both public values. Either one missing (the state until the
 * owner has set up Turnstile and the Worker) means "coming soon", not an error.
 */
export function emailConfig(sitekey: unknown, workerUrl: unknown): EmailConfig | null {
  const key = typeof sitekey === 'string' ? sitekey.trim() : '';
  const url = typeof workerUrl === 'string' ? workerUrl.trim() : '';
  if (!key || !url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') return null;
  } catch {
    return null;
  }
  return { sitekey: key, workerUrl: url };
}

/** Exchanges a Turnstile token for the address. Throws when the Worker refuses. */
export async function fetchEmail(
  workerUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error(`email request failed (${res.status})`);
  const body = (await res.json()) as { email?: unknown };
  const email = body.email;
  if (typeof email !== 'string' || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) {
    throw new Error('unexpected email response');
  }
  return email;
}
