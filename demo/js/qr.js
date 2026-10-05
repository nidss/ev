// QR drawing (qrcode-generator) and camera scanning (html5-qrcode), both loaded from CDN in index.html.

export function qrSvg(text, { size = 220, dark = '#0F2E42', light = '#FFFFFF' } = {}) {
  if (typeof window.qrcode !== 'function') return `<div class="qr-missing">QR</div>`;
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2; // quiet zone in modules
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + q} ${r + q}h1v1h-1z`;
  const total = n + q * 2;
  return `<svg class="qr" role="img" aria-label="QR code" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}

let active = null;

// Starts the camera inside element #id; calls onCode(text) once per distinct read.
export async function startScanner(id, onCode) {
  await stopScanner();
  if (!window.Html5Qrcode) throw new Error('scanner library not loaded');
  const scanner = new window.Html5Qrcode(id, { verbose: false });
  let last = '', lastAt = 0;
  await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text) => {
    const now = Date.now();
    if (text === last && now - lastAt < 3000) return; // ignore the same code held in front of the camera
    last = text; lastAt = now;
    onCode(text);
  });
  active = scanner;
}

export async function stopScanner() {
  if (!active) return;
  try { await active.stop(); active.clear(); } catch { /* already stopped */ }
  active = null;
}
