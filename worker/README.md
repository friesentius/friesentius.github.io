# Contact-email Worker

Hands out the contact address only after a Cloudflare Turnstile check passes,
so the address is never in the site's source or build output. Free plan only.

The site's "show email" button (`src/components/ContactEmail.astro`) loads
Turnstile on demand and POSTs the token to this Worker. The Worker verifies it
with Cloudflare's `siteverify`, checks the hostname Turnstile reports against an
allow-list (`friesentius.github.io`, `friesentius.com`, `www.friesentius.com`,
`localhost`), and only then returns the address. CORS is limited to the same
hosts. Until the steps below are done the site shows "email coming soon".

## Owner steps

1. **Create the Turnstile widget.** Cloudflare dashboard > Turnstile > Add
   widget. Hostnames: `friesentius.github.io`, `friesentius.com`,
   `www.friesentius.com` (add `localhost` only for local testing). Mode:
   Managed. Copy the **sitekey** (public) and **secret key**.
2. **Log in to Wrangler.** `cd worker && npx wrangler login`
3. **Set the two secrets** (each prompts for the value; nothing goes in the repo):
   ```sh
   npx wrangler secret put TURNSTILE_SECRET   # the Turnstile secret key
   npx wrangler secret put CONTACT_EMAIL      # the address to reveal
   ```
   The first `secret put` offers to create the Worker if it does not exist yet.
4. **Deploy.** `npx wrangler deploy`. Note the `https://friesentius-contact.<your-subdomain>.workers.dev` URL it prints.
5. **Set the two public values** as GitHub repository **Actions variables**
   (Settings > Secrets and variables > Actions > Variables, not secrets):
   - `PUBLIC_TURNSTILE_SITEKEY`: the sitekey from step 1
   - `PUBLIC_EMAIL_WORKER_URL`: the Worker URL from step 4

   `.github/workflows/deploy.yml` passes both to the Pages build. The next
   deploy from `main` turns the button on.

Quick check after deploying: `curl -i -X POST -H 'Origin: https://friesentius.github.io' -d '{"token":"x"}' <worker url>`
should answer `403` (a bad token is refused), never the address.

## Local development

```sh
npm run test:unit        # unit tests (verify, CORS and hostname logic), from the repo root
cd worker && npx wrangler dev
```

For the site, copy `.env.example` to `.env` and fill in the sitekey and the
`wrangler dev` URL. Cloudflare publishes dummy Turnstile keys for testing
(`1x00000000000000000000AA` always passes); the hostname check still applies,
and the dummy keys report `example.com`, so a real widget with `localhost`
added is needed to exercise the full path.
