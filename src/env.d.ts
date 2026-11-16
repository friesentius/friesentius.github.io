/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Public Cloudflare Turnstile sitekey for the contact-email reveal. */
  readonly PUBLIC_TURNSTILE_SITEKEY?: string;
  /** URL of the contact-email Worker (see worker/README.md). */
  readonly PUBLIC_EMAIL_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
