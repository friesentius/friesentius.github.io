// The illustrative touch dial on the Neokeys case study: tapping (or pressing
// Enter or Space on) a key lights it and says what a leader sequence does.

export function setupDial(): void {
  const keys = Array.from(document.querySelectorAll<SVGGElement>('.illus .key'));
  const cap = document.getElementById('dialCap');
  let timer = 0;
  const press = (key: SVGGElement) => {
    keys.forEach((k) => k.classList.remove('hot'));
    key.classList.add('hot');
    if (cap) {
      const b = document.createElement('b');
      b.textContent = key.dataset.key ?? '';
      cap.replaceChildren('leader, then ', b, ' runs the command bound to it');
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => key.classList.remove('hot'), 1600);
  };
  keys.forEach((k) => {
    k.addEventListener('click', () => press(k));
    k.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        press(k);
      }
    });
  });
}
