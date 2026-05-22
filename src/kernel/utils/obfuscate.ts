export function obfuscate(text: string): string {
  const chars = text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256)));
  return btoa(chars.join(''));
}

export function deobfuscate(encoded: string): string | null {
  try {
    const chars = atob(encoded).split('');
    return chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256))).join('');
  } catch { return null; }
}
