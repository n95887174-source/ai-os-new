/**
 * XOR-based "obfuscation" — NOT a security measure.
 *
 * This is a trivial reversible transformation used only to discourage
 * casual inspection of non-sensitive values (e.g. last typed prompt) in
 * localStorage. It provides NO cryptographic security — anyone with
 * the source code can trivially reverse it.
 *
 * For real secrets (API keys, tokens) use the kernel SecurityService
 * AES-GCM encryption, not this function.
 */
export function xorEncode(text: string): string {
  const chars = text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256)));
  return btoa(chars.join(''));
}

export function xorDecode(encoded: string): string | null {
  try {
    const chars = atob(encoded).split('');
    return chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256))).join('');
  } catch { return null; }
}
