// The "show email" control (src/components/ContactEmail.astro). Turnstile is
// loaded only when a visitor asks for the address, so no third-party script
// runs on a normal page view.

import { emailConfig, fetchEmail } from '../lib/email';
import { currentTheme } from './prefs';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Turnstile {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      theme: 'light' | 'dark';
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
      'timeout-callback': () => void;
    },
  ): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('no api')));
    s.onerror = () => reject(new Error('could not load Turnstile'));
    document.head.append(s);
  }).catch((e: unknown) => {
    loading = null;
    throw e;
  });
  return loading;
}

function setupSlot(slot: HTMLElement): void {
  const config = emailConfig(slot.dataset.sitekey, slot.dataset.worker);
  const btn = slot.querySelector<HTMLButtonElement>('[data-email-btn]');
  const widget = slot.querySelector<HTMLElement>('[data-email-widget]');
  const status = slot.querySelector<HTMLElement>('[data-email-status]');
  if (!config || !btn || !widget || !status) return;
  btn.hidden = false;
  let widgetId: string | null = null;

  const say = (text: string): void => {
    status.textContent = text;
  };

  const reveal = (email: string): void => {
    const a = document.createElement('a');
    a.href = `mailto:${email}`;
    a.textContent = email;
    slot.replaceChildren(a);
    a.focus();
  };

  const fail = (text: string): void => {
    if (widgetId !== null) window.turnstile?.remove(widgetId);
    widgetId = null;
    widget.replaceChildren();
    btn.disabled = false;
    btn.textContent = 'try again';
    say(text);
  };

  const onToken = (token: string): void => {
    say('Fetching the address...');
    fetchEmail(config.workerUrl, token)
      .then(reveal)
      .catch(() => fail('Could not get the address. Try again, or use the links here.'));
  };

  btn.addEventListener('click', () => {
    btn.disabled = true;
    say('Loading the check...');
    loadTurnstile()
      .then((turnstile) => {
        say('Complete the check to show the address.');
        widgetId = turnstile.render(widget, {
          sitekey: config.sitekey,
          theme: currentTheme(),
          callback: onToken,
          'error-callback': () => fail('The check failed. Try again.'),
          'expired-callback': () => fail('The check expired. Try again.'),
          'timeout-callback': () => fail('The check timed out. Try again.'),
        });
      })
      .catch(() => fail('Could not load the check. Try again, or use the links here.'));
  });
}

export function setupEmail(): void {
  document.querySelectorAll<HTMLElement>('[data-email-slot]').forEach(setupSlot);
}
