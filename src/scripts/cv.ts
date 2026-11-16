// The CV's print button (hidden without JavaScript, where it could not work).

export function setupPrint(): void {
  document.getElementById('printBtn')?.addEventListener('click', () => window.print());
}
