// Turns shell output parts (src/lib/shell.ts) into DOM nodes.

import type { Part } from '../lib/shell';

export function renderPart(part: Part): Node {
  if (typeof part === 'string') return document.createTextNode(part);
  let node: HTMLElement;
  if (part.href) {
    const a = document.createElement('a');
    a.href = part.href;
    a.textContent = part.text;
    node = a;
  } else if (part.strong) {
    node = document.createElement('b');
    node.textContent = part.text;
  } else {
    node = document.createElement('span');
    node.textContent = part.text;
  }
  if (part.color) node.classList.add(part.color === 'accent' ? 'pr' : 'okl');
  if (part.placeholder) {
    const ph = document.createElement('span');
    ph.className = 'ph';
    ph.title = 'Placeholder copy';
    ph.append(node);
    return ph;
  }
  return node;
}
