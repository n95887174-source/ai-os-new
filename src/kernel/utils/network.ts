const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc00:|fe80:)/i;
const PRIVATE_HOST_RE = /\.(local|internal|localhost)$/i;

export function isPrivateIP(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h === '::1' || h === '127.0.0.1') return true;
  if (h.startsWith('::ffff:')) {
    const ipv4 = h.slice(7);
    if (PRIVATE_IP_RE.test(ipv4)) return true;
  }
  if (PRIVATE_IP_RE.test(h)) return true;
  if (PRIVATE_HOST_RE.test(h)) return true;
  return false;
}

export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (isPrivateIP(parsed.hostname)) return false;
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1') return false;
    return true;
  } catch {
    return false;
  }
}
