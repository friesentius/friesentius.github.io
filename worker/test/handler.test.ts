import { describe, expect, it, vi } from 'vitest';
import { allowedOrigin, handleRequest, verifyToken, type Env } from '../src/handler';

const SITE = 'https://friesentius.github.io';
// Not a real address: the test only needs a value to see returned.
const EMAIL = 'owner@example.test';
const env: Env = { TURNSTILE_SECRET: 'secret', CONTACT_EMAIL: EMAIL };

const verdict = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

const post = (body: unknown, origin: string | null = SITE) =>
  new Request('https://worker.example/', {
    method: 'POST',
    headers: { ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': '203.0.113.9' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('allowedOrigin', () => {
  it('accepts the site hostnames over https and localhost over http', () => {
    for (const o of [
      'https://friesentius.github.io',
      'https://friesentius.com',
      'https://www.friesentius.com',
      'http://localhost:4321',
      'http://localhost',
    ]) {
      expect(allowedOrigin(o)).toBe(o);
    }
  });

  it('rejects other hosts, wrong schemes, ports and lookalikes', () => {
    for (const o of [
      null,
      '',
      'null',
      'https://evil.example',
      'http://friesentius.github.io',
      'https://friesentius.github.io:8443',
      'https://friesentius.github.io.evil.example',
      'https://evilfriesentius.com',
      'https://localhost:4321',
      'https://friesentius.github.io/path',
    ]) {
      expect(allowedOrigin(o)).toBeNull();
    }
  });
});

describe('verifyToken', () => {
  it('posts the secret, token and client IP to siteverify', async () => {
    const f = verdict({ success: true, hostname: 'friesentius.com' });
    expect(await verifyToken('tok', 'sec', '203.0.113.9', f)).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    const form = init.body as URLSearchParams;
    expect(form.get('secret')).toBe('sec');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('203.0.113.9');
  });

  it('fails when Turnstile says no or names another hostname', async () => {
    expect(await verifyToken('t', 's', null, verdict({ success: false }))).toBe(false);
    expect(
      await verifyToken('t', 's', null, verdict({ success: true, hostname: 'evil.example' })),
    ).toBe(false);
    expect(await verifyToken('t', 's', null, verdict({ success: true }))).toBe(false);
  });

  it('throws when siteverify itself errors', async () => {
    await expect(verifyToken('t', 's', null, verdict({}, 500))).rejects.toThrow();
  });
});

describe('handleRequest', () => {
  const ok = () => verdict({ success: true, hostname: 'friesentius.github.io' });

  it('returns the email only after a passing check, with CORS for the origin', async () => {
    const res = await handleRequest(post({ token: 'abc' }), env, ok());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: EMAIL });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('never leaks the email on any failure path', async () => {
    const cases: Array<[Request, Env, ReturnType<typeof verdict>]> = [
      [post({ token: 'abc' }), env, verdict({ success: false })],
      [post({ token: 'abc' }), env, verdict({ success: true, hostname: 'evil.example' })],
      [post({ token: 'abc' }), env, verdict({}, 500)],
      [post({ token: 'abc' }, 'https://evil.example'), env, ok()],
      [post({ token: 'abc' }, null), env, ok()],
      [post({}), env, ok()],
      [post('not json'), env, ok()],
      [post({ token: 'abc' }), { CONTACT_EMAIL: EMAIL }, ok()],
    ];
    for (const [req, e, f] of cases) {
      const res = await handleRequest(req, e, f);
      expect(res.status).not.toBe(200);
      expect(await res.text()).not.toContain(EMAIL);
    }
  });

  it('uses the right status for each failure', async () => {
    expect(
      (await handleRequest(post({ token: 'a' }), env, verdict({ success: false }))).status,
    ).toBe(403);
    expect((await handleRequest(post({ token: 'a' }), env, verdict({}, 500))).status).toBe(502);
    expect((await handleRequest(post({}), env, ok())).status).toBe(400);
    expect(
      (await handleRequest(post({ token: 'a' }, 'https://evil.example'), env, ok())).status,
    ).toBe(403);
    expect(
      (await handleRequest(post({ token: 'a' }), { ...env, CONTACT_EMAIL: '' }, ok())).status,
    ).toBe(500);
  });

  it('does not call siteverify for a disallowed origin or a bad body', async () => {
    const f = ok();
    await handleRequest(post({ token: 'a' }, 'https://evil.example'), env, f);
    await handleRequest(post({ token: 'x'.repeat(5000) }), env, f);
    expect(f).not.toHaveBeenCalled();
  });

  it('answers preflight for allowed origins only', async () => {
    const pre = (origin: string) =>
      new Request('https://worker.example/', { method: 'OPTIONS', headers: { Origin: origin } });
    const allowed = await handleRequest(pre(SITE), env, ok());
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    const denied = await handleRequest(pre('https://evil.example'), env, ok());
    expect(denied.status).toBe(403);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('rejects other methods', async () => {
    const res = await handleRequest(
      new Request('https://worker.example/', { method: 'GET', headers: { Origin: SITE } }),
      env,
      ok(),
    );
    expect(res.status).toBe(405);
  });
});
