import { describe, expect, it, vi } from 'vitest';
import { emailConfig, fetchEmail } from '../../src/lib/email';

describe('emailConfig', () => {
  it('needs both the sitekey and the worker URL', () => {
    expect(emailConfig(undefined, undefined)).toBeNull();
    expect(emailConfig('key', undefined)).toBeNull();
    expect(emailConfig(undefined, 'https://w.example')).toBeNull();
    expect(emailConfig('', ' ')).toBeNull();
    expect(emailConfig('key', 'https://w.example')).toEqual({
      sitekey: 'key',
      workerUrl: 'https://w.example',
    });
  });

  it('rejects an unparseable or insecure worker URL', () => {
    expect(emailConfig('key', 'not a url')).toBeNull();
    expect(emailConfig('key', 'http://w.example')).toBeNull();
    expect(emailConfig('key', 'http://localhost:8787')).not.toBeNull();
  });
});

describe('fetchEmail', () => {
  const reply = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it('posts the token as JSON and returns the address', async () => {
    const f = reply({ email: 'a@b.example' });
    expect(await fetchEmail('https://w.example', 'tok', f as unknown as typeof fetch)).toBe(
      'a@b.example',
    );
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://w.example');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'tok' });
  });

  it('throws on a refusal or a malformed reply', async () => {
    const run = (f: ReturnType<typeof reply>) =>
      fetchEmail('https://w.example', 't', f as unknown as typeof fetch);
    await expect(run(reply({ error: 'x' }, 403))).rejects.toThrow('403');
    await expect(run(reply({}))).rejects.toThrow();
    await expect(run(reply({ email: 'javascript:alert(1)' }))).rejects.toThrow();
    await expect(run(reply({ email: 5 }))).rejects.toThrow();
  });
});
